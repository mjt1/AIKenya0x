"""
app/routers/advisory.py — POST /advisory/ask
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_advisory_service
from app.models.requests import AdvisoryRequest
from app.models.responses import AdvisoryResponse, ErrorResponse
from app.services.advisory import AdvisoryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/advisory", tags=["Advisory (GraphRAG)"])


@router.post(
    "/ask",
    response_model=AdvisoryResponse,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "LLM or internal error"},
    },
    summary="Generate a grounded advisory answer (GraphRAG)",
    description=(
        "Receives a free-text agent question, the farmer's Neo4j subgraph summary, "
        "and top-k ManualChunks retrieved by the backend via vector search. "
        "Generates a cited, grounded answer using the large advisory model. "
        "\n\n"
        "Safety guarantees:\n"
        "- Answers are strictly grounded in provided chunks (no fabrication).\n"
        "- Every cited claim maps back to a chunk_id.\n"
        "- CRITICAL severity issues, notifiable diseases, and low-confidence answers "
        "  always trigger `referral_needed: true`.\n"
        "- When no chunks are retrieved, confidence is forced to LOW and referral is triggered."
    ),
    operation_id="advisoryAsk",
)
async def advisory_ask(
    body: AdvisoryRequest,
    service: AdvisoryService = Depends(get_advisory_service),
) -> AdvisoryResponse:
    try:
        result = await service.answer(body)
        logger.info(
            "Advisory answer for farmer=%s | enterprise=%s | confidence=%s | referral=%s | citations=%d",
            body.farmer_context.farmer_id,
            body.enterprise_type.value,
            result.confidence,
            result.referral_needed,
            len(result.citations),
        )
        return result
    except ValueError as exc:
        logger.warning("JSON parse error in /advisory/ask: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned malformed JSON: {exc}",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /advisory/ask")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
