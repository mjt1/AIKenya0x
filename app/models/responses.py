"""
app/models/responses.py — Pydantic v2 response schemas for the Suluhu AI service.

Everything the backend unpacks and forwards (or stores in Neo4j) comes from here.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from app.models.requests import EnterpriseType, Severity


# ── Feature 1: Note Structuring ───────────────────────────────────────────────

class StructuredIssue(BaseModel):
    text: str = Field(..., description="Human-readable description of the issue.")
    enterprise: EnterpriseType
    severity: Severity
    contagious_flag: bool = Field(
        default=False,
        description="True if this issue could spread to neighbouring farms.",
    )


class StructuredAdvice(BaseModel):
    text: str = Field(..., description="Specific action the agent advised.")
    enterprise: EnterpriseType


class StructureNoteResponse(BaseModel):
    observation: str = Field(..., description="Objective description of what was seen.")
    issues: list[StructuredIssue] = []
    advice: list[StructuredAdvice] = []
    enterprise_tags: list[EnterpriseType] = Field(
        ...,
        description="Enterprise types detected in the note.",
    )
    follow_up_required: bool = False
    raw_note_language: str = Field(
        default="en",
        description="Detected language of the original note (en | sw | mixed).",
    )
    model_used: str | None = None


# ── Feature 2: Issue Classification ──────────────────────────────────────────

class DairyCategoryEnum(str):
    """Documentary enum — actual values validated in classifier."""
    pass


class ClassifyResponse(BaseModel):
    category: str = Field(
        ...,
        description=(
            "Dairy: MASTITIS | FOOT_ROT | MILK_DROP | REPRODUCTIVE_ISSUE | "
            "FEED_DEFICIENCY | TICK_INFESTATION | RESPIRATORY_DISEASE | "
            "SKIN_CONDITION | BLOAT | CALVING_COMPLICATION | BRUCELLOSIS_SUSPECTED | OTHER_DAIRY. "
            "Sugarcane: TOP_DRESSING_NEEDED | SMUT_SUSPECTED | RATOON_STUNTING_DISEASE | "
            "LODGING | WATERLOGGING | STALK_BORER | YELLOW_LEAF_SYNDROME | WEED_PRESSURE | "
            "HARVEST_WINDOW | TRASH_MANAGEMENT | NITROGEN_DEFICIENCY | PHOSPHORUS_DEFICIENCY | "
            "POTASSIUM_DEFICIENCY | OTHER_SUGARCANE."
        ),
    )
    severity: Severity
    confidence: float = Field(..., ge=0.0, le=1.0)
    enterprise_route: EnterpriseType = Field(
        ...,
        description="DAIRY routes to vet logic; SUGARCANE routes to agronomy logic.",
    )
    contagious: bool = Field(
        default=False,
        description="True triggers Risk Propagation (Feature 10) in the backend.",
    )
    tags: list[str] = Field(default=[], description="Freeform keyword tags for graph enrichment.")
    reasoning: str = Field(..., description="Short model justification — surfaced in explainability logs.")
    model_used: str | None = None


# ── Feature 3: Embeddings ─────────────────────────────────────────────────────

class EmbedResponse(BaseModel):
    embeddings: list[list[float]] = Field(
        ...,
        description="One embedding vector per input text, in the same order.",
    )
    dim: int = Field(..., description="Embedding dimension (e.g. 384 for bge-small-en).")
    model_used: str
    normalised: bool


# ── Feature 4: Advisory (GraphRAG) ───────────────────────────────────────────

class CitedChunk(BaseModel):
    chunk_id: str
    source: str
    page: str | None = None
    relevance: str = Field(..., description="One-line explanation of why this chunk was cited.")


class InputRecommendation(BaseModel):
    name: str = Field(..., description="Input product name, e.g. 'CAN Fertiliser', 'Oxytetracycline'.")
    quantity: str | None = None
    unit: str | None = None
    notes: str | None = None


class AdvisoryResponse(BaseModel):
    answer: str = Field(
        ...,
        description="The grounded advisory answer in plain English (or mixed Swahili where appropriate).",
    )
    citations: list[CitedChunk] = Field(
        default=[],
        description="Manual chunks the answer was grounded in.",
    )
    confidence: str = Field(
        ...,
        pattern="^(HIGH|MEDIUM|LOW)$",
        description="HIGH: strong chunk match. MEDIUM: partial. LOW: weak — triggers referral nudge.",
    )
    referral_needed: bool = Field(
        ...,
        description="True if issue severity, contagion risk, or low confidence warrants a vet/agronomist.",
    )
    referral_reason: str | None = Field(
        default=None,
        description="Human-readable reason for referral — shown to agent.",
    )
    action_items: list[str] = Field(
        default=[],
        description="Ordered list of concrete steps for the agent.",
    )
    inputs_needed: list[InputRecommendation] = Field(
        default=[],
        description="Specific inputs the agent should carry on the next visit — feeds Input-Demand Aggregation.",
    )
    model_used: str | None = None


# ── Shared: Health & Error ────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    embedding_model: str
    chat_model: str
    advisory_model: str


class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None
