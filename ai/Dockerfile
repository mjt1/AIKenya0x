# --- Stage 1: build dependencies ---------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tooling for packages that compile native extensions (e.g. numpy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt


# --- Stage 2: runtime image --------------------------------------------------
FROM python:3.11-slim AS runtime

LABEL maintainer="DigiCow Africa <dev@digicow.africa>"
LABEL description="Suluhu AI Service — agricultural advisory inference for extension agents"

# Non-root user for security
RUN addgroup --system suluhu && adduser --system --ingroup suluhu suluhu

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/

# HuggingFace / sentence-transformers cache.
# huggingface_hub uses HF_HOME / HF_HUB_CACHE (NOT the legacy TRANSFORMERS_CACHE)
# and defaults them under $HOME/.cache, which the non-root user cannot write —
# that was the original "Permission denied (os error 13)". Point every cache var
# at /tmp, which is always writable (no volume/ownership trap), and disable the
# Xet downloader (its writer also failed here). The embedding model is fetched
# over plain HTTPS once, on the first /embed call.
#
# NOTE: not baked into the image and NOT offline on purpose — offline mode makes
# any missing cache file fatal; allowing a one-time runtime download is the
# robust path. Network is needed at first /embed (and for Featherless anyway).
ENV HOME=/app \
    HF_HOME=/tmp/huggingface \
    HF_HUB_CACHE=/tmp/huggingface/hub \
    SENTENCE_TRANSFORMERS_HOME=/tmp/huggingface \
    TRANSFORMERS_CACHE=/tmp/huggingface \
    HF_HUB_DISABLE_XET=1

RUN chown -R suluhu:suluhu /app

USER suluhu

EXPOSE 8001

# Uvicorn with 1 worker (model singleton safety; increase for production).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", \
     "--workers", "1", "--log-level", "info"]
