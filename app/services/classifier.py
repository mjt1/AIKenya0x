"""
app/services/classifier.py

Classifies a single observation into a precise agronomic / veterinary category,
severity, and contagion flag. The backend uses these to:
  • Route issues to the correct knowledge base (dairy vet vs. sugarcane agronomy)
  • Score the prioritisation queue
  • Trigger Risk Propagation Alerts (Feature 10) when contagious=True
"""

from __future__ import annotations

import logging

from app.config import get_settings
from app.models.requests import ClassifyRequest, EnterpriseType
from app.models.responses import ClassifyResponse, Severity
from app.prompts.classify_prompts import CLASSIFY_SYSTEM, build_classify_user_prompt
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

_VALID_SEVERITIES = {s.value for s in Severity}
_VALID_ENTERPRISES = {EnterpriseType.DAIRY.value, EnterpriseType.SUGARCANE.value}

# All known categories — anything outside this set is normalised to OTHER_*
_DAIRY_CATEGORIES = {
    "MASTITIS", "FOOT_ROT", "MILK_DROP", "REPRODUCTIVE_ISSUE", "FEED_DEFICIENCY",
    "TICK_INFESTATION", "RESPIRATORY_DISEASE", "SKIN_CONDITION", "BLOAT",
    "CALVING_COMPLICATION", "BRUCELLOSIS_SUSPECTED", "OTHER_DAIRY",
}
_SUGARCANE_CATEGORIES = {
    "TOP_DRESSING_NEEDED", "SMUT_SUSPECTED", "RATOON_STUNTING_DISEASE", "LODGING",
    "WATERLOGGING", "STALK_BORER", "YELLOW_LEAF_SYNDROME", "WEED_PRESSURE",
    "HARVEST_WINDOW", "TRASH_MANAGEMENT", "NITROGEN_DEFICIENCY",
    "PHOSPHORUS_DEFICIENCY", "POTASSIUM_DEFICIENCY", "OTHER_SUGARCANE",
}
_ALL_CATEGORIES = _DAIRY_CATEGORIES | _SUGARCANE_CATEGORIES

# These categories ALWAYS trigger referral_needed in advisory, regardless of confidence
NOTIFIABLE_CATEGORIES = {
    "BRUCELLOSIS_SUSPECTED",
    "SMUT_SUSPECTED",
    "RATOON_STUNTING_DISEASE",
    "YELLOW_LEAF_SYNDROME",
    "RESPIRATORY_DISEASE",  # CBPP risk in Kenya
}


class ClassifierService:
    def __init__(self, llm: LLMClient) -> None:
        self._llm = llm

    async def classify(self, req: ClassifyRequest) -> ClassifyResponse:
        cfg = get_settings()

        user_prompt = build_classify_user_prompt(
            observation_text=req.observation_text,
            enterprise_type=req.enterprise_type.value,
            recent_issues=req.recent_issues,
        )

        raw = await self._llm.chat_json(
            system_prompt=CLASSIFY_SYSTEM,
            user_prompt=user_prompt,
        )

        logger.debug("Classifier raw output for farmer %s: %s", req.farmer_id, raw)

        # ── Normalise category ────────────────────────────────────────────────
        category = str(raw.get("category", "")).upper().strip()
        if category not in _ALL_CATEGORIES:
            fallback = (
                "OTHER_DAIRY" if req.enterprise_type == EnterpriseType.DAIRY else "OTHER_SUGARCANE"
            )
            logger.warning(
                "Unknown category '%s' returned by LLM; falling back to '%s'.",
                category,
                fallback,
            )
            category = fallback

        # ── Normalise severity ────────────────────────────────────────────────
        severity = str(raw.get("severity", "MEDIUM")).upper()
        if severity not in _VALID_SEVERITIES:
            severity = "MEDIUM"

        # ── Normalise confidence ──────────────────────────────────────────────
        try:
            confidence = float(raw.get("confidence", 0.6))
            confidence = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            confidence = 0.6

        # ── Enterprise route ──────────────────────────────────────────────────
        route = str(raw.get("enterprise_route", req.enterprise_type.value)).upper()
        if route not in _VALID_ENTERPRISES:
            route = req.enterprise_type.value

        # ── Contagious override: certain categories are always contagious ─────
        contagious = bool(raw.get("contagious", False))
        if category in {
            "BRUCELLOSIS_SUSPECTED", "SMUT_SUSPECTED", "RATOON_STUNTING_DISEASE",
            "YELLOW_LEAF_SYNDROME", "SKIN_CONDITION",
        }:
            contagious = True

        tags = [str(t) for t in raw.get("tags", [])]
        reasoning = str(raw.get("reasoning", ""))

        return ClassifyResponse(
            category=category,
            severity=Severity(severity),
            confidence=confidence,
            enterprise_route=EnterpriseType(route),
            contagious=contagious,
            tags=tags,
            reasoning=reasoning,
            model_used=cfg.featherless_chat_model,
        )
