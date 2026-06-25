"""
app/services/note_structurer.py

Converts free-text agent field notes into structured Observation / Issue / Advice
objects ready to be persisted as Neo4j nodes by the backend.
"""

from __future__ import annotations

import logging

from app.config import get_settings
from app.models.requests import EnterpriseType, StructureNoteRequest
from app.models.responses import StructureNoteResponse, StructuredAdvice, StructuredIssue, Severity
from app.prompts.structure_prompts import STRUCTURE_NOTE_SYSTEM, build_structure_user_prompt
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

# Categories the LLM may return — validated here before hydrating the response
_VALID_SEVERITIES = {s.value for s in Severity}
_VALID_ENTERPRISES = {e.value for e in EnterpriseType if e != EnterpriseType.BOTH}


class NoteStructurerService:
    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    async def structure(self, req: StructureNoteRequest) -> StructureNoteResponse:
        cfg = get_settings()

        enterprise_types = [e.value for e in req.enterprise_types]
        user_prompt = build_structure_user_prompt(
            raw_note=req.raw_note,
            enterprise_types=enterprise_types,
            farmer_id=req.farmer_id,
        )

        raw = await self._llm.chat_json(
            system_prompt=STRUCTURE_NOTE_SYSTEM,
            user_prompt=user_prompt,
        )

        logger.debug("Structure LLM raw output for farmer %s: %s", req.farmer_id, raw)

        # ── Hydrate and validate ───────────────────────────────────────────────
        issues: list[StructuredIssue] = []
        for item in raw.get("issues", []):
            sev = item.get("severity", "MEDIUM")
            if sev not in _VALID_SEVERITIES:
                sev = "MEDIUM"
            ent = item.get("enterprise", enterprise_types[0])
            if ent not in _VALID_ENTERPRISES:
                ent = enterprise_types[0]

            issues.append(
                StructuredIssue(
                    text=str(item.get("text", "")),
                    enterprise=EnterpriseType(ent),
                    severity=Severity(sev),
                    contagious_flag=bool(item.get("contagious_flag", False)),
                )
            )

        advice: list[StructuredAdvice] = []
        for item in raw.get("advice", []):
            ent = item.get("enterprise", enterprise_types[0])
            if ent not in _VALID_ENTERPRISES:
                ent = enterprise_types[0]
            advice.append(
                StructuredAdvice(
                    text=str(item.get("text", "")),
                    enterprise=EnterpriseType(ent),
                )
            )

        # enterprise_tags
        raw_tags = raw.get("enterprise_tags", enterprise_types)
        tags = [EnterpriseType(t) for t in raw_tags if t in _VALID_ENTERPRISES]
        if not tags:
            tags = [EnterpriseType(e) for e in enterprise_types]

        return StructureNoteResponse(
            observation=str(raw.get("observation", req.raw_note[:200])),
            issues=issues,
            advice=advice,
            enterprise_tags=tags,
            follow_up_required=bool(raw.get("follow_up_required", bool(issues))),
            raw_note_language=str(raw.get("raw_note_language", "en")),
            model_used=cfg.featherless_chat_model,
        )
