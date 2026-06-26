"""
app/services/ranker.py

Bounded re-ranker for the prioritisation queue (PRD Feature 4 / US-07..09).

The backend computes deterministic priorities (Cypher); this service refines
them within a tight band and writes a specific rationale per item. It is the
"AI hosts the scorer behind the same contract" path described in PRD 2.3.

Safety: the deterministic base_priority is the anchor. The model may only nudge
within +/- max_adjustment; this service re-clamps every value and NEVER drops a
candidate, so a misbehaving model can't bury an urgent farmer or lose one. The
backend re-clamps again and falls back to its deterministic rationale if this
service is unavailable.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.config import get_settings
from app.models.requests import RankCandidate, RankRequest
from app.models.responses import RankResponse, RankedItem
from app.prompts.rank_prompts import RANK_SYSTEM, build_rank_user_prompt
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

# Token budget. Reasoning models (Qwen3, DeepSeek-R1, ...) spend a large,
# roughly fixed <think> block before emitting the JSON, so we reserve generous
# headroom on top of a per-candidate output allowance, capped at a value most
# Featherless models can complete.
_THINK_HEADROOM = 1800
_PER_ITEM_TOKENS = 96
_MAX_TOKENS_CAP = 4096


class RankerService:
    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    async def rank(self, req: RankRequest) -> RankResponse:
        cfg = get_settings()
        model_used = cfg.featherless_chat_model

        # Nothing to do — keep the contract simple for the backend.
        if not req.candidates:
            return RankResponse(ranked=[], model_used=model_used)

        max_adj = req.max_adjustment

        payload = [
            {
                "dedupe_key": c.dedupe_key,
                "kind": c.kind,
                "farmer_name": c.farmer_name,
                "reason": c.reason,
                "base_priority": c.base_priority,
                "context": c.context,
            }
            for c in req.candidates
        ]
        user_prompt = build_rank_user_prompt(
            candidates_json=json.dumps(payload, ensure_ascii=False),
            count=len(req.candidates),
            max_adjustment=max_adj,
            agent_county=req.agent_county,
            today=req.today,
        )

        # Reserve room for a reasoning model's <think> block + the JSON output.
        max_tokens = min(
            _MAX_TOKENS_CAP,
            _THINK_HEADROOM + _PER_ITEM_TOKENS * len(req.candidates),
        )

        raw = await self._llm.chat_json(
            system_prompt=RANK_SYSTEM,
            user_prompt=user_prompt,
            max_tokens=max_tokens,
        )

        by_key = self._index_by_key(raw)
        ranked = [self._resolve(c, by_key.get(c.dedupe_key), max_adj) for c in req.candidates]
        return RankResponse(ranked=ranked, model_used=model_used)

    @staticmethod
    def _index_by_key(raw: dict[str, Any]) -> dict[str, dict[str, Any]]:
        items = raw.get("ranked")
        if not isinstance(items, list):
            logger.warning("Ranker LLM output missing 'ranked' list; using deterministic anchors.")
            return {}
        out: dict[str, dict[str, Any]] = {}
        for it in items:
            if isinstance(it, dict) and isinstance(it.get("dedupe_key"), str):
                out[it["dedupe_key"]] = it
        return out

    @staticmethod
    def _resolve(
        c: RankCandidate,
        item: dict[str, Any] | None,
        max_adj: int,
    ) -> RankedItem:
        lo = max(0, c.base_priority - max_adj)
        hi = min(100, c.base_priority + max_adj)

        # Model omitted this candidate -> keep the deterministic anchor + rule reason.
        if item is None:
            return RankedItem(
                dedupe_key=c.dedupe_key,
                priority=c.base_priority,
                rationale=c.reason,
                confidence=None,
            )

        # Bounded priority (re-clamp regardless of what the model returned).
        try:
            proposed = int(round(float(item.get("priority", c.base_priority))))
        except (TypeError, ValueError):
            proposed = c.base_priority
        priority = max(lo, min(hi, proposed))

        # Rationale (fall back to the rule reason if blank).
        rationale = str(item.get("rationale", "")).strip() or c.reason

        # Confidence (optional, clamped to [0,1]).
        confidence: float | None = None
        if item.get("confidence") is not None:
            try:
                confidence = max(0.0, min(1.0, float(item["confidence"])))
            except (TypeError, ValueError):
                confidence = None

        return RankedItem(
            dedupe_key=c.dedupe_key,
            priority=priority,
            rationale=rationale,
            confidence=confidence,
        )
