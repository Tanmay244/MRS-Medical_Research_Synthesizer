"""Application configuration management.

This module centralises environment configuration for the RAG system. All
secrets and environment-specific values are sourced from environment variables
to simplify deployment across local and cloud environments. Defaults here are
placeholder values that **must** be overridden in production deployments.
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import BaseSettings, Field, validator


class Settings(BaseSettings):
    """Core application settings loaded from environment variables."""

    # ------------------------------------------------------------------
    # Application
    # ------------------------------------------------------------------
    app_name: str = Field("Medical Research Synthesizer", env="APP_NAME")
    api_prefix: str = Field("/api", env="API_PREFIX")
    debug: bool = Field(False, env="DEBUG")
    environment: str = Field("development", env="ENVIRONMENT")

    # ------------------------------------------------------------------
    # AWS & Bedrock configuration (placeholders must be replaced)
    # ------------------------------------------------------------------
    aws_access_key_id: str = Field(
        "YOUR_AWS_ACCESS_KEY", env="AWS_ACCESS_KEY_ID"
    )
    aws_secret_access_key: str = Field(
        "YOUR_AWS_SECRET_KEY", env="AWS_SECRET_ACCESS_KEY"
    )
    aws_session_token: Optional[str] = Field(None, env="AWS_SESSION_TOKEN")
    aws_region: str = Field("us-east-1", env="AWS_REGION")

    bedrock_model_id: str = Field(
        "anthropic.claude-3-sonnet-20240229-v1:0", env="BEDROCK_MODEL_ID"
    )
    bedrock_embedding_model_id: str = Field(
        "amazon.titan-embed-text-v1", env="EMBEDDING_MODEL_ID"
    )
    bedrock_max_tokens: int = Field(4096, env="BEDROCK_MAX_TOKENS")
    bedrock_temperature: float = Field(0.2, env="BEDROCK_TEMPERATURE")

    # ------------------------------------------------------------------
    # Local vector store configuration
    # ------------------------------------------------------------------
    vector_store_path: str = Field("data/vector_store.json", env="VECTOR_STORE_PATH")

    # ------------------------------------------------------------------
    # S3 document storage
    # ------------------------------------------------------------------
    s3_bucket: str = Field("your-research-corpus-bucket", env="S3_BUCKET")
    s3_prefix: str = Field("documents/", env="S3_PREFIX")
    s3_multipart_chunksize_mb: int = Field(32, env="S3_MULTIPART_CHUNKSIZE_MB")

    # ------------------------------------------------------------------
    # Document ingestion controls
    # ------------------------------------------------------------------
    supported_file_types: List[str] = Field(
        default_factory=lambda: [".pdf", ".txt", ".docx"],
        env="SUPPORTED_FILE_TYPES",
    )
    chunk_overlap: int = Field(128, env="CHUNK_OVERLAP")
    chunk_size: int = Field(1024, env="CHUNK_SIZE")
    max_chunk_tokens: int = Field(800, env="MAX_CHUNK_TOKENS")
    duplicate_detection_threshold: float = Field(
        0.92, env="DUPLICATE_DETECTION_THRESHOLD"
    )

    # ------------------------------------------------------------------
    # Retrieval parameters
    # ------------------------------------------------------------------
    hybrid_search_weight: float = Field(0.6, env="HYBRID_SEARCH_WEIGHT")
    max_retrieval_results: int = Field(25, env="MAX_RETRIEVAL_RESULTS")
    rerank_top_k: int = Field(10, env="RERANK_TOP_K")
    metadata_filter_fields: List[str] = Field(
        default_factory=lambda: ["year", "journal", "authors"],
        env="METADATA_FILTER_FIELDS",
    )

    # ------------------------------------------------------------------
    # Monitoring & metrics
    # ------------------------------------------------------------------
    enable_tracing: bool = Field(True, env="ENABLE_TRACING")
    metrics_namespace: str = Field("research-rag", env="METRICS_NAMESPACE")
    log_level: str = Field("INFO", env="LOG_LEVEL")

    # ------------------------------------------------------------------
    # Authentication / security (optional AWS Cognito)
    # ------------------------------------------------------------------
    cognito_user_pool_id: Optional[str] = Field(None, env="COGNITO_USER_POOL_ID")
    cognito_client_id: Optional[str] = Field(None, env="COGNITO_CLIENT_ID")
    allowed_origins: List[str] = Field(default_factory=list, env="ALLOWED_ORIGINS")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    @validator("allowed_origins", pre=True)
    def _split_origins(cls, value: Optional[str]) -> List[str]:
        if not value:
            return []
        if isinstance(value, list):
            return value
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @validator("supported_file_types", "metadata_filter_fields", pre=True)
    def _split_comma_separated(cls, value):
        if value is None or value == "":
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()


settings = get_settings()


