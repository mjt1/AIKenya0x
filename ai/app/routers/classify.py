"""
app/routers/classify.py — POST /classify
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_classifier
from app.models.requests import ClassifyRequest
from app.models.responses import ClassifyResponse, ErrorResponse
from app.services.classifier import ClassifierService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/classify", tags=["Issue Classification"])


@router.post(
    "",
    response_model=ClassifyResponse,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "LLM or internal error"},
    },
    summary="Classify an agricultural observation",
    description=(
        "Maps a single observation text to a precise agronomic (sugarcane) or "
        "veterinary (dairy) category with severity, confidence score, and a contagion flag. "
        "The backend uses the contagious flag to trigger Risk Propagation Alerts (Feature 10). "
        "Confidence below the configured threshold surfaces a referral nudge."
    ),
    operation_id="classifyIssue",
)
async def classify_issue(
    body: ClassifyRequest,
    service: ClassifierService = Depends(get_classifier),
) -> ClassifyResponse:
    try:
        result = await service.classify(body)
        logger.info(
            "Classified issue for farmer=%s | category=%s | severity=%s | confidence=%.2f | contagious=%s",
            body.farmer_id,
            result.category,
            result.severity.value,
            result.confidence,
            result.contagious,
        )
        return result
    except ValueError as exc:
        logger.warning("JSON parse error in /classify: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned malformed JSON: {exc}",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /classify")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
