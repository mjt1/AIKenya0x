"""
app/services/embedder.py

Local sentence-transformer embeddings (BAAI/bge-small-en-v1.5, 384-dim).
Running locally avoids an extra API call and keeps latency low for batch ingestion.

The model is loaded once at startup and reused for all requests.
Output dimension and model name are exposed in responses so the backend
can validate they match the Neo4j vector index configuration.
"""

from __future__ import annotations

import logging
from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import get_settings

logger = logging.getLogger(__name__)


class EmbedderService:
    """
    Wraps a sentence-transformers model.
    Loaded lazily on first call to avoid blocking startup if the
    model hasn't been downloaded yet in a cold-start scenario.
    """

    def __init__(self) -> None:
        self._model: SentenceTransformer | None = None
        cfg = get_settings()
        self.model_name = cfg.embedding_model
        self.expected_dim = cfg.embedding_dim

    def _get_model(self) -> SentenceTransformer:
        if self._model is None:
            logger.info("Loading embedding model '%s' — this may take a moment on first run.", self.model_name)
            self._model = SentenceTransformer(self.model_name)
            actual_dim = self._model.get_sentence_embedding_dimension()
            if actual_dim != self.expected_dim:
                logger.warning(
                    "Embedding dim mismatch: expected %d, got %d. "
                    "Update EMBEDDING_DIM in .env to match your Neo4j vector index.",
                    self.expected_dim,
                    actual_dim,
                )
            logger.info("Embedding model loaded. Dimension: %d", actual_dim)
        return self._model

    def embed(self, texts: list[str], normalise: bool = True) -> list[list[float]]:
        """
        Embed a list of texts and return a list of float vectors.

        Args:
            texts: Input strings. Empty strings are allowed but return zero vectors.
            normalise: L2-normalise vectors (required for cosine similarity in Neo4j).

        Returns:
            List of embedding vectors, one per input text.
        """
        if not texts:
            return []

        model = self._get_model()
        embeddings: np.ndarray = model.encode(
            texts,
            normalize_embeddings=normalise,
            show_progress_bar=False,
            batch_size=64,
        )
        # Convert to plain Python floats for JSON serialisation
        return [vec.tolist() for vec in embeddings]

    @property
    def dim(self) -> int:
        return self._get_model().get_sentence_embedding_dimension()  # type: ignore[return-value]
