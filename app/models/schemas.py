"""Pydantic schemas for API requests and responses."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class Citation(BaseModel):
    id: str
    paper_title: str
    authors: List[str]
    year: int = Field(ge=0)
    journal: str
    excerpt: str
    page_number: Optional[int] = Field(None, ge=0)
    confidence: float = Field(ge=0.0, le=1.0)


class ResearchQuery(BaseModel):
    question: str = Field(..., min_length=5)
    filters: Optional[Dict[str, Any]] = None
    max_results: int = Field(10, ge=1, le=50)


class ResearchResponse(BaseModel):
    answer: str
    sources: List[Citation]
    confidence: float = Field(ge=0.0, le=1.0)
    query_time: float = Field(ge=0.0)
    total_sources: int = Field(ge=0)
    evidence: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    conflicts: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentMetadata(BaseModel):
    title: Optional[str]
    authors: List[str] = Field(default_factory=list)
    journal: Optional[str]
    year: Optional[int]
    doi: Optional[str]
    url: Optional[str]


class DocumentUploadResponse(BaseModel):
    document_id: str
    chunks_indexed: int
    duplicate: bool


class BatchIngestionResponse(BaseModel):
    results: List[DocumentUploadResponse]


class QueryHistoryRecord(BaseModel):
    id: str
    question: str
    answer: str
    created_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ReindexRequest(BaseModel):
    force: bool = False


class MetricsResponse(BaseModel):
    ingestion_latency_ms: float
    retrieval_latency_ms: float
    generation_latency_ms: float
    documents_indexed: int


class HealthResponse(BaseModel):
    status: str
    bedrock: bool
    vector_store: bool
    s3: bool


class DocumentBatchItem(BaseModel):
    filename: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator("content")
    def validate_content(cls, value: str) -> str:
        if not value:
            raise ValueError("Document content cannot be empty")
        return value

