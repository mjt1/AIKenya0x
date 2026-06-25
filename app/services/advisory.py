"""
app/services/advisory.py

GraphRAG advisory answer generation.

The backend has already:
  1. Embedded the query (via /embed)
  2. Retrieved top-k ManualChunks from Neo4j vector search
  3. Loaded the farmer subgraph
  4. Assembled the AdvisoryRequest payload

This service composes the grounded, cited answer using the heavier advisory model
and enforces referral logic as a post-processing safety layer.
"""

from __future__ import annotations

import logging

from app.config import get_settings
from app.models.requests import AdvisoryRequest
from app.models.responses import AdvisoryResponse, CitedChunk, InputRecommendation
from app.prompts.advisory_prompts import ADVISORY_SYSTEM, build_advisory_user_prompt
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

# Categories that MUST trigger referral regardless of LLM output
_HARD_REFERRAL_CATEGORIES = {
    "BRUCELLOSIS_SUSPECTED", "SMUT_SUSPECTED", "RATOON_STUNTING_DISEASE",
    "YELLOW_LEAF_SYNDROME", "RESPIRATORY_DISEASE",
}

# Confidence string → numeric for comparisons
_CONFIDENCE_ORDER = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}


class AdvisoryService:
    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    async def answer(self, req: AdvisoryRequest) -> AdvisoryResponse:
        cfg = get_settings()

        # ── Build context payload ─────────────────────────────────────────────
        farmer_dict = req.farmer_context.model_dump()
        chunks_list = [c.model_dump() for c in req.retrieved_chunks]

        user_prompt = build_advisory_user_prompt(
            query=req.query,
            farmer_context=farmer_dict,
            retrieved_chunks=chunks_list,
            enterprise_type=req.enterprise_type.value,
            top_k_used=req.top_k_used,
        )

        raw = await self._llm.advisory_chat(
            system_prompt=ADVISORY_SYSTEM,
            user_prompt=user_prompt,
        )

        logger.debug(
            "Advisory raw output for farmer %s | query: %s",
            req.farmer_context.farmer_id,
            req.query[:80],
        )

        # ── Hydrate citations ─────────────────────────────────────────────────
        citations: list[CitedChunk] = []
        # Build lookup of known chunk IDs for validation
        known_chunk_ids = {c.chunk_id for c in req.retrieved_chunks}

        for item in raw.get("citations", []):
            cid = str(item.get("chunk_id", ""))
            # Only include citations from chunks that were actually provided
            if cid and (cid in known_chunk_ids or not known_chunk_ids):
                citations.append(
                    CitedChunk(
                        chunk_id=cid,
                        source=str(item.get("source", "Unknown source")),
                        page=item.get("page"),
                        relevance=str(item.get("relevance", "")),
                    )
                )

        # ── Hydrate inputs_needed ─────────────────────────────────────────────
        inputs_needed: list[InputRecommendation] = []
        for item in raw.get("inputs_needed", []):
            inputs_needed.append(
                InputRecommendation(
                    name=str(item.get("name", "")),
                    quantity=item.get("quantity"),
                    unit=item.get("unit"),
                    notes=item.get("notes"),
                )
            )

        # ── Normalise confidence ──────────────────────────────────────────────
        confidence = str(raw.get("confidence", "MEDIUM")).upper()
        if confidence not in _CONFIDENCE_ORDER:
            confidence = "MEDIUM"

        # ── Safety override: force LOW + referral when no chunks retrieved ────
        if not req.retrieved_chunks:
            confidence = "LOW"

        # ── Referral logic (post-processing safety layer) ─────────────────────
        referral_needed = bool(raw.get("referral_needed", False))
        referral_reason: str | None = raw.get("referral_reason") or None

        # Check if any recent issue category triggers hard referral
        recent_categories = {
            issue.get("category", "") for issue in req.farmer_context.recent_issues
        }
        if recent_categories & _HARD_REFERRAL_CATEGORIES:
            referral_needed = True
            referral_reason = (
                referral_reason
                or "A notifiable disease was recently recorded for this farmer. "
                   "Always involve the County Veterinary Officer or Kenya Plant Health Inspectorate."
            )

        # Confidence too low → always refer
        if (
            cfg.high_risk_auto_refer
            and _CONFIDENCE_ORDER[confidence] == 1  # LOW
        ):
            referral_needed = True
            referral_reason = referral_reason or (
                "Advisory confidence is LOW — the knowledge base does not contain "
                "sufficient information to answer this question reliably. "
                "Please consult a qualified agronomist or veterinary officer."
            )

        # No referral reason when not referring
        if not referral_needed:
            referral_reason = None

        action_items = [str(a) for a in raw.get("action_items", [])]

        return AdvisoryResponse(
            answer=str(raw.get("answer", "")),
            citations=citations,
            confidence=confidence,
            referral_needed=referral_needed,
            referral_reason=referral_reason,
            action_items=action_items,
            inputs_needed=inputs_needed,
            model_used=cfg.featherless_advisory_model,
        )
