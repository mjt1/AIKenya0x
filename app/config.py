"""
app/config.py — centralised settings loaded from environment / .env file.
All other modules import `get_settings()` instead of os.environ directly.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ───────────────────────────────────────────────────────────────────
    app_name: str = "Suluhu AI Service"
    app_version: str = "0.2.0"
    debug: bool = False
    log_level: str = "INFO"

    # ── Featherless AI ────────────────────────────────────────────────────────
    featherless_api_key: str
    featherless_base_url: str = "https://api.featherless.ai/v1"

    # General-purpose model (structuring, classification)
    featherless_chat_model: str = "meta-llama/Meta-Llama-3.1-8B-Instruct"

    # High-quality model reserved for advisory generation
    featherless_advisory_model: str = "meta-llama/Llama-3.3-70B-Instruct"

    # ── Embeddings ────────────────────────────────────────────────────────────
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384

    # ── LLM generation params ─────────────────────────────────────────────────
    llm_temperature: float = 0.2
    llm_max_tokens: int = 1024
    llm_advisory_max_tokens: int = 2048

    # ── Rate limiting ─────────────────────────────────────────────────────────
    rate_limit_per_minute: int = 60

    # ── Confidence / referral thresholds ─────────────────────────────────────
    referral_confidence_threshold: float = 0.55
    high_risk_auto_refer: bool = True


@lru_cache
def get_settings() -> Settings:
    """Cached singleton — only parsed once per process lifetime."""
    return Settings()  # type: ignore[call-arg]
