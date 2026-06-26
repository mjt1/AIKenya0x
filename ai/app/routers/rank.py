"""
app/routers/rank.py - POST /rank

Bounded re-ranking of the backend's deterministic recommendation candidates
(PRD Feature 4 / US-07..09). The backend stays the source of truth for the
deterministic score and re-clamps + falls back if this endpoint is unavailable.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_ranker
from app.models.requests import RankRequest
from app.models.responses import RankResponse, ErrorResponse
from app.services.ranker import RankerService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Prioritisation"])


@router.post(
    "/rank",
    response_model=RankResponse,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "LLM or internal error"},
    },
    summary="Bounded re-rank of deterministic recommendation candidates",
    description=(
        "Receives the backend's deterministic candidates (each with a rule-based "
        "reason and base priority) and refines each priority within "
        "+/- max_adjustment, returning a specific, farmer-grounded rationale. "
        "\n\n"
        "Guarantees:\n"
        "- Exactly one item per candidate, dedupe_keys echoed unchanged.\n"
        "- Every priority re-clamped to base +/- max_adjustment (and 0-100).\n"
        "- The deterministic base is the anchor; the model only nudges it."
    ),
    operation_id="rankRecommendations",
)
async def rank(
    body: RankRequest,
    service: RankerService = Depends(get_ranker),
) -> RankResponse:
    try:
        result = await service.rank(body)
        logger.info(
            "Ranked %d candidate(s) -> %d item(s)",
            len(body.candidates),
            len(result.ranked),
        )
        return result
    except ValueError as exc:
        logger.warning("JSON parse error in /rank: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned malformed JSON: {exc}",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /rank")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
