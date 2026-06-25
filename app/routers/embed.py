"""
app/routers/embed.py — POST /embed
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_embedder
from app.models.requests import EmbedRequest
from app.models.responses import EmbedResponse, ErrorResponse
from app.services.embedder import EmbedderService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/embed", tags=["Embeddings"])


@router.post(
    "",
    response_model=EmbedResponse,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Embedding error"},
    },
    summary="Generate dense embedding vectors",
    description=(
        "Embeds one or more text passages using a local sentence-transformer model "
        "(BAAI/bge-small-en-v1.5, 384 dimensions). Used by the backend to: "
        "(1) index ManualChunks into the Neo4j vector index during KB ingestion, and "
        "(2) embed an agent query before vector search at advisory time. "
        "Vectors are L2-normalised by default, matching Neo4j cosine similarity behaviour."
    ),
    operation_id="embedTexts",
)
async def embed_texts(
    body: EmbedRequest,
    service: EmbedderService = Depends(get_embedder),
) -> EmbedResponse:
    if not body.texts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'texts' must contain at least one string.",
        )
    if len(body.texts) > 512:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Batch size exceeds maximum of 512 texts per request.",
        )

    try:
        embeddings = service.embed(body.texts, normalise=body.normalise)
        logger.info("Embedded %d text(s) | dim=%d | normalised=%s", len(body.texts), service.dim, body.normalise)
        return EmbedResponse(
            embeddings=embeddings,
            dim=service.dim,
            model_used=service.model_name,
            normalised=body.normalise,
        )
    except Exception as exc:
        logger.exception("Unexpected error in /embed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
