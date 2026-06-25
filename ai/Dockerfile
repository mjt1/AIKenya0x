# ── Stage 1: build dependencies ───────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tooling for packages that compile native extensions (e.g. numpy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: runtime image ─────────────────────────────────────────────────────
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

# sentence-transformers caches models under ~/.cache/huggingface
# Mount a volume here in production to persist the downloaded model across restarts
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
RUN mkdir -p /app/.cache/huggingface && chown -R suluhu:suluhu /app

USER suluhu

EXPOSE 8001

# Uvicorn with 2 workers (increase for production; keep 1 for model singleton safety in dev)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", \
     "--workers", "1", "--log-level", "info"]
