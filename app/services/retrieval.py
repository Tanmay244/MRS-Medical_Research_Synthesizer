"""Hybrid retrieval service combining semantic and keyword search."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional

from app.core.config import settings
from app.models.schemas import Citation, ResearchQuery
from app.utils.embedding import EmbeddingService
from app.services.vector_store import LocalVectorStore

logger = logging.getLogger(__name__)


@dataclass
class RetrievedDocument:
    chunk_id: str
    score: float
    content: str
    metadata: Dict[str, str]

    @property
    def citation(self) -> Citation:
        authors_raw = self.metadata.get("authors", "")
        authors = [author.strip() for author in authors_raw.split(";") if author.strip()]
        year_raw = self.metadata.get("year")
        try:
            year = int(year_raw) if year_raw else 0
        except (TypeError, ValueError):
            year = 0
        page_raw = self.metadata.get("page_number")
        try:
            page_number = int(page_raw) if page_raw else None
        except (TypeError, ValueError):
            page_number = None

        return Citation(
            id=self.metadata.get("document_id", self.chunk_id),
            paper_title=self.metadata.get("title", "Unknown Title"),
            authors=authors,
            year=year,
            journal=self.metadata.get("journal", ""),
            excerpt=self.content[:500],
            page_number=page_number,
            confidence=min(max(self.score, 0.0), 1.0),
        )


class RetrievalService:
    def __init__(
        self,
        embedding_service: EmbeddingService,
        vector_store: LocalVectorStore,
        hybrid_weight: float = settings.hybrid_search_weight,
    ) -> None:
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.hybrid_weight = hybrid_weight

    def retrieve(self, query: ResearchQuery) -> List[RetrievedDocument]:
        vector = self.embedding_service.embed([query.question])[0]
        top_k = max(query.max_results, settings.rerank_top_k)
        search_results = self.vector_store.search(
            question=query.question,
            query_embedding=vector,
            filters=query.filters,
            metadata_filter_fields=settings.metadata_filter_fields,
            hybrid_weight=self.hybrid_weight,
            top_k=top_k,
        )

        documents: Dict[str, RetrievedDocument] = {}
        for result in search_results:
            chunk = result["chunk"]
            metadata = result["metadata"]
            retrieved = RetrievedDocument(
                chunk_id=chunk.get("chunk_id"),
                score=result["score"],
                content=chunk.get("content", ""),
                metadata=metadata,
            )
            documents[retrieved.chunk_id] = retrieved

        reranked = sorted(documents.values(), key=lambda doc: doc.score, reverse=True)
        top_k = reranked[: query.max_results]
        logger.debug("Vector store retrieval produced %s documents", len(top_k))
        return top_k

