"""FastAPI dependency injection wiring for core services."""

from __future__ import annotations

import boto3
from functools import lru_cache

from app.core.config import Settings, settings
from app.models.database import MetricsAggregator, QueryHistoryStore
from app.services.bedrock_client import BedrockClient
from app.services.generation import GenerationService
from app.services.ingestion import DocumentIngestionService
from app.services.retrieval import RetrievalService
from app.services.vector_store import LocalVectorStore
from app.utils.chunking import Chunker
from app.utils.embedding import EmbeddingService


def get_settings() -> Settings:
    return settings


@lru_cache()
def _boto_session() -> boto3.Session:
    return boto3.Session(
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        aws_session_token=settings.aws_session_token,
        region_name=settings.aws_region,
    )


@lru_cache()
def get_bedrock_client() -> BedrockClient:
    return BedrockClient(region_name=settings.aws_region)


@lru_cache()
def get_s3_client():
    session = _boto_session()
    return session.client("s3")


@lru_cache()
def get_chunker() -> Chunker:
    return Chunker(
        max_characters=settings.chunk_size,
        overlap=settings.chunk_overlap,
        max_tokens=settings.max_chunk_tokens,
    )


@lru_cache()
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService(
        bedrock_client=get_bedrock_client(),
        model_id=settings.bedrock_embedding_model_id,
    )


@lru_cache()
def get_vector_store() -> LocalVectorStore:
    return LocalVectorStore(settings.vector_store_path)


@lru_cache()
def get_ingestion_service() -> DocumentIngestionService:
    return DocumentIngestionService(
        embedding_service=get_embedding_service(),
        chunker=get_chunker(),
        s3_client=get_s3_client(),
        vector_store=get_vector_store(),
    )


@lru_cache()
def get_retrieval_service() -> RetrievalService:
    return RetrievalService(
        embedding_service=get_embedding_service(),
        vector_store=get_vector_store(),
    )


@lru_cache()
def get_generation_service() -> GenerationService:
    return GenerationService(get_bedrock_client())


@lru_cache()
def get_query_history_store() -> QueryHistoryStore:
    return QueryHistoryStore()


@lru_cache()
def get_metrics_aggregator() -> MetricsAggregator:
    return MetricsAggregator()


