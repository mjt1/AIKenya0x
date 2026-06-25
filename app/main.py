"""
app/main.py — Suluhu AI Service entry point.

Starts the FastAPI application, registers middleware, mounts routers,
and provides a health-check endpoint.

Run locally:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.dependencies import get_embedder  # pre-warm embedding model
from app.models.responses import HealthResponse
from app.routers import structure, classify, embed, advisory

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

cfg = get_settings()


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm the embedding model so the first /embed request is fast
    logger.info("Warming up embedding model...")
    try:
        emb = get_embedder()
        _ = emb.embed(["warm up"])
        logger.info("Embedding model ready. Dim=%d", emb.dim)
    except Exception as exc:
        logger.warning("Embedding model warm-up failed (will retry on first request): %s", exc)

    logger.info("%s v%s ready.", cfg.app_name, cfg.app_version)
    yield
    logger.info("Shutting down %s.", cfg.app_name)


# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{cfg.rate_limit_per_minute}/minute"])


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=cfg.app_name,
    version=cfg.app_version,
    description=(
        "Stateless AI inference service for the Suluhu farmer-intelligence copilot. "
        "Provides note structuring, issue classification, dense embeddings, "
        "and grounded GraphRAG advisory answers for dairy and sugarcane extension agents "
        "in Western Kenya.\n\n"
        "**This service is internal** — only the NestJS backend should call it. "
        "All Neo4j access lives in the backend; this service receives context payloads."
    ),
    contact={"name": "DigiCow Africa / Kenya AI Challenge", "email": "dev@digicow.africa"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # backend → service; restrict to backend host in production
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed:.1f}"
    return response


# ── Health check ──────────────────────────────────────────────────────────────
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Meta"],
    summary="Service health check",
    description="Returns 200 when the service is up. The backend polls this before forwarding requests.",
)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=cfg.app_version,
        embedding_model=cfg.embedding_model,
        chat_model=cfg.featherless_chat_model,
        advisory_model=cfg.featherless_advisory_model,
    )


@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse(
        content={"service": cfg.app_name, "version": cfg.app_version, "docs": "/docs"},
        status_code=status.HTTP_200_OK,
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(structure.router)
app.include_router(classify.router)
app.include_router(embed.router)
app.include_router(advisory.router)
