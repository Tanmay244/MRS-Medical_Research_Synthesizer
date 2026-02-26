"""In-memory persistence layer for query history and metrics."""

from __future__ import annotations

from collections import deque
from statistics import mean
from threading import Lock
from typing import Deque, List

from app.models.schemas import MetricsResponse, QueryHistoryRecord


class QueryHistoryStore:
    """Thread-safe in-memory history store suitable for MVP deployments."""

    def __init__(self, max_items: int = 500) -> None:
        self._entries: Deque[QueryHistoryRecord] = deque(maxlen=max_items)
        self._lock = Lock()

    async def add(self, record: QueryHistoryRecord) -> None:
        with self._lock:
            self._entries.appendleft(record)

    async def list(self, limit: int = 50) -> List[QueryHistoryRecord]:
        with self._lock:
            return list(list(self._entries)[:limit])


class MetricsAggregator:
    def __init__(self) -> None:
        self._lock = Lock()
        self._ingestion_latencies: List[float] = []
        self._retrieval_latencies: List[float] = []
        self._generation_latencies: List[float] = []
        self._documents_indexed: int = 0

    async def record_ingestion(self, latency_ms: float, documents: int) -> None:
        with self._lock:
            self._ingestion_latencies.append(latency_ms)
            self._documents_indexed += documents

    async def record_retrieval(self, latency_ms: float) -> None:
        with self._lock:
            self._retrieval_latencies.append(latency_ms)

    async def record_generation(self, latency_ms: float) -> None:
        with self._lock:
            self._generation_latencies.append(latency_ms)

    async def snapshot(self) -> MetricsResponse:
        with self._lock:
            return MetricsResponse(
                ingestion_latency_ms=mean(self._ingestion_latencies) if self._ingestion_latencies else 0.0,
                retrieval_latency_ms=mean(self._retrieval_latencies) if self._retrieval_latencies else 0.0,
                generation_latency_ms=mean(self._generation_latencies) if self._generation_latencies else 0.0,
                documents_indexed=self._documents_indexed,
            )

