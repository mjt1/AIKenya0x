"""
app/routers/structure.py — POST /structure-note
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_note_structurer
from app.models.requests import StructureNoteRequest
from app.models.responses import StructureNoteResponse, ErrorResponse
from app.services.note_structurer import NoteStructurerService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/structure-note", tags=["Note Structuring"])


@router.post(
    "",
    response_model=StructureNoteResponse,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "LLM or internal error"},
    },
    summary="Structure a free-text agent field note",
    description=(
        "Converts raw visit notes (English or Swahili) into typed Observation / Issue / "
        "Advice objects. Detects enterprise context, issue severity, and contagion flags. "
        "Called by the backend immediately after a visit is submitted."
    ),
    operation_id="structureNote",
)
async def structure_note(
    body: StructureNoteRequest,
    service: NoteStructurerService = Depends(get_note_structurer),
) -> StructureNoteResponse:
    try:
        result = await service.structure(body)
        logger.info(
            "Structured note for farmer=%s | issues=%d | enterprise_tags=%s",
            body.farmer_id,
            len(result.issues),
            [t.value for t in result.enterprise_tags],
        )
        return result
    except ValueError as exc:
        logger.warning("JSON parse error in structure-note: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM returned malformed JSON: {exc}",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in /structure-note")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
