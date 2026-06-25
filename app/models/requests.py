"""
app/models/requests.py — Pydantic v2 request schemas for the Suluhu AI service.

These are the DTOs the NestJS backend sends to this service.
Field descriptions are preserved in the generated OpenAPI spec.
"""

from __future__ import annotations
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


# ── Shared enums ──────────────────────────────────────────────────────────────

class EnterpriseType(str, Enum):
    DAIRY = "DAIRY"
    SUGARCANE = "SUGARCANE"
    BOTH = "BOTH"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ── Feature 1: Note Structuring ───────────────────────────────────────────────

class StructureNoteRequest(BaseModel):
    """
    POST /structure-note
    Raw agent field note → structured observation/issue/advice triplet.
    """

    raw_note: str = Field(
        ...,
        min_length=10,
        max_length=4000,
        description="Free-text visit note typed or voice-transcribed by the agent in the field.",
        examples=["Cow 3 has reduced milk today, only 4L instead of 8L. Udder looks swollen on one quarter. Gave CMT test, positive. Advised farmer to separate and start intramammary."],
    )
    farmer_id: str = Field(
        ...,
        description="Neo4j Farmer node ID — used for logging and traceability.",
    )
    enterprise_types: list[EnterpriseType] = Field(
        default=[EnterpriseType.DAIRY],
        description="Which enterprises this farmer runs; drives which vocabulary the structurer uses.",
    )
    agent_language_hint: str = Field(
        default="en",
        description="Primary language of the note (en | sw). Swahili notes are auto-detected too.",
    )


# ── Feature 2: Issue Classification ──────────────────────────────────────────

class ClassifyRequest(BaseModel):
    """
    POST /classify
    A single observation text → classified issue with severity + contagion flag.
    """

    observation_text: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="The observation text extracted from the structured note or typed directly.",
    )
    enterprise_type: EnterpriseType = Field(
        ...,
        description="Primary enterprise this observation relates to.",
    )
    farmer_id: str = Field(
        ...,
        description="Farmer node ID — for context and audit trail.",
    )
    recent_issues: list[str] = Field(
        default=[],
        description="Categories of issues recorded for this farmer in the last 14 days — helps disambiguate recurring patterns.",
    )


# ── Feature 3: Embeddings ─────────────────────────────────────────────────────

class EmbedRequest(BaseModel):
    """
    POST /embed
    One or more text passages → dense embedding vectors.
    Used by the backend to index ManualChunks in Neo4j or to embed a query.
    """

    texts: list[str] = Field(
        ...,
        min_length=1,
        max_length=512,
        description="List of texts to embed. Batch up to 512 items.",
        examples=[["Top-dressing sugarcane with CAN at 5 bags per acre at 3 months."]],
    )
    # Normalise for cosine similarity (default true — matches Neo4j vector index behaviour)
    normalise: bool = Field(
        default=True,
        description="L2-normalise embeddings before returning (required for cosine similarity in Neo4j).",
    )


# ── Feature 4: Advisory (GraphRAG) ───────────────────────────────────────────

class ManualChunk(BaseModel):
    """A single retrieved knowledge-base chunk passed from the backend."""

    chunk_id: str = Field(..., description="ManualChunk node ID in Neo4j.")
    source: str = Field(..., description="Source document title, e.g. 'KALRO Sugarcane Production Manual 2021'.")
    page: str | None = Field(default=None, description="Page or section reference.")
    text: str = Field(..., description="The chunk text — what the LLM grounds its answer in.")
    similarity_score: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Cosine similarity score from vector search.",
    )


class AnimalSummary(BaseModel):
    animal_id: str
    breed: str | None = None
    lactation_stage: str | None = None
    avg_daily_yield_l: float | None = None
    last_yield_l: float | None = None
    days_since_last_visit: int | None = None


class FieldSummary(BaseModel):
    field_id: str
    area_ha: float | None = None
    variety: str | None = None
    ratoon_cycle: int | None = None
    months_since_planting: int | None = None
    last_top_dressed_at: str | None = None
    last_harvest_date: str | None = None


class FarmerContext(BaseModel):
    """Farmer subgraph summary composed by the backend before calling /advisory/ask."""

    farmer_id: str
    farmer_name: str
    location: str | None = None
    county: str | None = None
    enterprise_types: list[EnterpriseType] = []

    # Dairy assets
    animals: list[AnimalSummary] = []

    # Sugarcane assets
    fields: list[FieldSummary] = []

    # Recent visit context
    last_visit_date: str | None = None
    recent_issues: list[dict[str, Any]] = Field(
        default=[],
        description="Last 5 recorded issues: [{category, severity, status, date}]",
    )
    recent_advice: list[str] = Field(
        default=[],
        description="Last 3 advice items given to this farmer.",
    )


class AdvisoryRequest(BaseModel):
    """
    POST /advisory/ask
    Grounded Q&A using retrieved manual chunks + farmer subgraph.
    The backend does the retrieval; this service generates the cited answer.
    """

    query: str = Field(
        ...,
        min_length=5,
        max_length=1000,
        description="The agent's question in natural language (English or Swahili).",
        examples=["Ng'ombe wangu wana maziwa kidogo sana, nifanye nini?"],
    )
    farmer_context: FarmerContext = Field(
        ...,
        description="Farmer subgraph summary from Neo4j.",
    )
    retrieved_chunks: list[ManualChunk] = Field(
        ...,
        min_length=0,
        description="Top-k manual chunks returned by Neo4j vector search. Can be empty if KB has no match.",
    )
    enterprise_type: EnterpriseType = Field(
        ...,
        description="Primary enterprise the query concerns.",
    )
    top_k_used: int = Field(
        default=5,
        description="Number of chunks the backend retrieved — metadata for confidence scoring.",
    )
