"""REST API endpoints for the research RAG system."""

from __future__ import annotations

import io
import time
from datetime import datetime
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from app.api.dependencies import (
    get_generation_service,
    get_ingestion_service,
    get_metrics_aggregator,
    get_query_history_store,
    get_retrieval_service,
    get_settings,
)
from app.core.config import Settings
from app.models.database import MetricsAggregator, QueryHistoryStore
from app.models.schemas import (
    BatchIngestionResponse,
    DocumentBatchItem,
    DocumentMetadata,
    DocumentUploadResponse,
    HealthResponse,
    MetricsResponse,
    ReindexRequest,
    ResearchQuery,
    ResearchResponse,
    QueryHistoryRecord,
)
from app.services.generation import GenerationService
from app.services.ingestion import DocumentIngestionService
from app.services.retrieval import RetrievalService

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check(
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    ingestion_service = get_ingestion_service()
    generation_service = get_generation_service()
    retrieval_service = get_retrieval_service()

    bedrock_ok = generation_service._client.health_check()
    s3_ok = True
    vector_store_ok = True
    try:
        ingestion_service.s3_client.head_bucket(Bucket=settings.s3_bucket)
    except Exception:
        s3_ok = False

    try:
        retrieval_service.vector_store.list_documents()
    except Exception:
        vector_store_ok = False

    status = "ok" if bedrock_ok and s3_ok and vector_store_ok else "degraded"
    return HealthResponse(status=status, bedrock=bedrock_ok, vector_store=vector_store_ok, s3=s3_ok)


@router.get("/metrics", response_model=MetricsResponse, tags=["system"])
async def metrics(
    metrics_aggregator: MetricsAggregator = Depends(get_metrics_aggregator),
) -> MetricsResponse:
    return await metrics_aggregator.snapshot()


@router.post("/admin/reindex", tags=["system"])
async def reindex(
    payload: ReindexRequest,
) -> dict:
    if not payload.force:
        raise HTTPException(status_code=400, detail="Force flag required for reindex operation")
    return {"status": "vector store does not require reindexing"}


@router.post("/documents/upload", response_model=DocumentUploadResponse, tags=["documents"])
async def upload_document(
    file: UploadFile = File(...),
    metadata_json: str = Form(None),
    ingestion_service: DocumentIngestionService = Depends(get_ingestion_service),
    metrics_aggregator: MetricsAggregator = Depends(get_metrics_aggregator),
) -> DocumentUploadResponse:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    metadata_payload = {}
    if metadata_json:
        try:
            metadata_model = DocumentMetadata.parse_raw(metadata_json)
            metadata_payload = metadata_model.dict(exclude_none=True)
        except ValidationError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid metadata payload: {exc}")

    start = time.perf_counter()
    result = ingestion_service.ingest_document(
        document_stream=io.BytesIO(content),
        filename=file.filename,
        metadata=metadata_payload,
    )
    latency_ms = (time.perf_counter() - start) * 1000
    await metrics_aggregator.record_ingestion(latency_ms, documents=0 if result.duplicate else result.chunks_indexed)
    return DocumentUploadResponse(
        document_id=result.document_id,
        chunks_indexed=result.chunks_indexed,
        duplicate=result.duplicate,
    )


@router.post("/documents/batch", response_model=BatchIngestionResponse, tags=["documents"])
async def batch_upload(
    payload: List[DocumentBatchItem],
    ingestion_service: DocumentIngestionService = Depends(get_ingestion_service),
    metrics_aggregator: MetricsAggregator = Depends(get_metrics_aggregator),
) -> BatchIngestionResponse:
    documents = []
    for item in payload:
        documents.append((io.BytesIO(item.content.encode("utf-8")), item.filename, item.metadata))

    start = time.perf_counter()
    results = ingestion_service.ingest_batch(documents)
    latency_ms = (time.perf_counter() - start) * 1000
    indexed_count = sum(result.chunks_indexed for result in results if not result.duplicate)
    await metrics_aggregator.record_ingestion(latency_ms, documents=indexed_count)

    formatted = [
        DocumentUploadResponse(
            document_id=result.document_id,
            chunks_indexed=result.chunks_indexed,
            duplicate=result.duplicate,
        )
        for result in results
    ]
    return BatchIngestionResponse(results=formatted)


@router.get("/documents", tags=["documents"])
async def list_documents(
    ingestion_service: DocumentIngestionService = Depends(get_ingestion_service),
) -> dict:
    documents = ingestion_service.vector_store.list_documents()
    return {"documents": documents}


@router.delete("/documents/{doc_id}", tags=["documents"])
async def delete_document(
    doc_id: str,
    ingestion_service: DocumentIngestionService = Depends(get_ingestion_service),
) -> dict:
    removed = ingestion_service.remove_document(doc_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted", "document_id": doc_id}


@router.post("/query", response_model=ResearchResponse, tags=["research"])
async def research_query(
    payload: ResearchQuery,
    retrieval_service: RetrievalService = Depends(get_retrieval_service),
    generation_service: GenerationService = Depends(get_generation_service),
    history_store: QueryHistoryStore = Depends(get_query_history_store),
    metrics_aggregator: MetricsAggregator = Depends(get_metrics_aggregator),
) -> ResearchResponse:
    retrieval_start = time.perf_counter()
    documents = retrieval_service.retrieve(payload)
    retrieval_latency_ms = (time.perf_counter() - retrieval_start) * 1000
    await metrics_aggregator.record_retrieval(retrieval_latency_ms)

    generation_start = time.perf_counter()
    response = generation_service.generate(payload, documents)
    generation_latency_ms = (time.perf_counter() - generation_start) * 1000
    await metrics_aggregator.record_generation(generation_latency_ms)

    record = QueryHistoryRecord(
        id=str(uuid4()),
        question=payload.question,
        answer=response.answer,
        created_at=datetime.utcnow(),
        metadata=response.metadata,
    )
    await history_store.add(record)

    return response


@router.post("/query/chat", response_model=ResearchResponse, tags=["research"])
async def chat_query(
    payload: ResearchQuery,
    retrieval_service: RetrievalService = Depends(get_retrieval_service),
    generation_service: GenerationService = Depends(get_generation_service),
) -> ResearchResponse:
    documents = retrieval_service.retrieve(payload)
    return generation_service.generate(payload, documents)


@router.get("/query/history", tags=["research"])
async def query_history(
    history_store: QueryHistoryStore = Depends(get_query_history_store),
) -> List[QueryHistoryRecord]:
    return await history_store.list()

