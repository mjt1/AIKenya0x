"""
app/dependencies.py

FastAPI dependency providers.
All service instances are created once at startup and reused via module-level
singletons. This avoids re-loading the embedding model per request.
"""

from __future__ import annotations

from app.services.llm_client import LLMClient
from app.services.embedder import EmbedderService
from app.services.note_structurer import NoteStructurerService
from app.services.classifier import ClassifierService
from app.services.advisory import AdvisoryService

# ── Singletons (created at import time, shared across requests) ───────────────
_llm_client = LLMClient()
_embedder = EmbedderService()
_note_structurer = NoteStructurerService(llm=_llm_client)
_classifier = ClassifierService(llm=_llm_client)
_advisory = AdvisoryService(llm=_llm_client)


# ── Dependency providers ───────────────────────────────────────────────────────

def get_llm() -> LLMClient:
    return _llm_client


def get_embedder() -> EmbedderService:
    return _embedder


def get_note_structurer() -> NoteStructurerService:
    return _note_structurer


def get_classifier() -> ClassifierService:
    return _classifier


def get_advisory_service() -> AdvisoryService:
    return _advisory
