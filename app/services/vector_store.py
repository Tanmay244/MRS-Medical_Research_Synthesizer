import json
import math
import threading
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from app.utils.chunking import Chunk


def _tokenise(text: str) -> List[str]:
    return [token for token in text.lower().split() if token]


def _cosine_similarity(vector_a: List[float], vector_b: List[float]) -> float:
    if not vector_a or not vector_b or len(vector_a) != len(vector_b):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vector_a, vector_b))
    norm_a = math.sqrt(sum(a * a for a in vector_a))
    norm_b = math.sqrt(sum(b * b for b in vector_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)


def _normalise_metadata(metadata: Dict[str, object]) -> Dict[str, str]:
    normalised: Dict[str, str] = {}
    for key, value in metadata.items():
        if value is None:
            continue
        if isinstance(value, list):
            normalised[key] = "; ".join(str(item) for item in value if item is not None)
        else:
            normalised[key] = str(value)
    return normalised


class LocalVectorStore:
    """JSON-backed vector store for small-scale deployments."""

    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        if not self.path.exists():
            self._write({"documents": {}})

    # ------------------------------------------------------------------
    # Persistence utilities
    # ------------------------------------------------------------------
    def _read(self) -> Dict:
        with self.path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _write(self, data: Dict) -> None:
        tmp_path = self.path.with_suffix(".tmp")
        with tmp_path.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False)
        tmp_path.replace(self.path)

    # ------------------------------------------------------------------
    # Document management
    # ------------------------------------------------------------------
    def add_document(
        self,
        document_id: str,
        filename: str,
        document_metadata: Dict[str, str],
        chunks: List[Chunk],
        embeddings: List[List[float]],
    ) -> None:
        serialised_chunks = []
        for chunk, embedding in zip(chunks, embeddings):
            serialised_chunks.append(
                {
                    "chunk_id": chunk.chunk_id,
                    "position": chunk.position,
                    "content": chunk.content,
                    "metadata": _normalise_metadata(chunk.metadata),
                    "embedding": embedding,
                }
            )

        payload = {
            "filename": filename,
            "metadata": _normalise_metadata(document_metadata),
            "chunks": serialised_chunks,
        }

        with self._lock:
            data = self._read()
            data.setdefault("documents", {})[document_id] = payload
            self._write(data)

    def remove_document(self, document_id: str) -> bool:
        with self._lock:
            data = self._read()
            if document_id not in data.get("documents", {}):
                return False
            del data["documents"][document_id]
            self._write(data)
            return True

    def has_document(self, document_id: str) -> bool:
        data = self._read()
        return document_id in data.get("documents", {})

    def list_documents(self) -> List[Dict[str, Optional[str]]]:
        data = self._read()
        result = []
        for doc_id, details in data.get("documents", {}).items():
            metadata = details.get("metadata", {})
            year_value = metadata.get("year")
            try:
                year_numeric = int(year_value) if year_value is not None else None
            except (TypeError, ValueError):
                year_numeric = None
            result.append(
                {
                    "id": doc_id,
                    "title": metadata.get("title"),
                    "authors": metadata.get("authors"),
                    "journal": metadata.get("journal"),
                    "year": year_numeric,
                    "chunks": len(details.get("chunks", [])),
                }
            )
        return result

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------
    def _passes_filters(
        self,
        metadata: Dict[str, str],
        filters: Optional[Dict],
        metadata_filter_fields: Iterable[str],
    ) -> bool:
        if not filters:
            return True

        if "year_range" in filters:
            try:
                year_value = int(metadata.get("year"))
            except (TypeError, ValueError):
                return False
            start, end = filters["year_range"]
            if year_value < start or year_value > end:
                return False

        for field in metadata_filter_fields:
            if field in filters and filters[field]:
                allowed_values = filters[field]
                target_value = metadata.get(field)
                if target_value is None:
                    return False
                normalised_target = target_value.lower()
                if isinstance(allowed_values, list):
                    if all(normalised_target != str(value).lower() for value in allowed_values):
                        return False
                else:
                    if normalised_target != str(allowed_values).lower():
                        return False

        return True

    def search(
        self,
        question: str,
        query_embedding: List[float],
        filters: Optional[Dict],
        metadata_filter_fields: Iterable[str],
        hybrid_weight: float,
        top_k: int,
    ) -> List[Dict]:
        question_terms = _tokenise(question)
        if not question_terms:
            question_terms = [question.lower()]

        data = self._read()
        results: List[Tuple[float, Dict]] = []

        for document_id, details in data.get("documents", {}).items():
            doc_metadata = details.get("metadata", {})
            if not self._passes_filters(doc_metadata, filters, metadata_filter_fields):
                continue

            for chunk in details.get("chunks", []):
                chunk_metadata = {**doc_metadata, **chunk.get("metadata", {})}

                if not self._passes_filters(chunk_metadata, filters, metadata_filter_fields):
                    continue

                chunk_terms = _tokenise(chunk.get("content", ""))
                if not chunk_terms:
                    lexical_overlap = 0.0
                else:
                    overlap = len(set(question_terms) & set(chunk_terms))
                    lexical_overlap = overlap / len(question_terms)

                vector_score = _cosine_similarity(query_embedding, chunk.get("embedding", []))
                score = hybrid_weight * vector_score + (1 - hybrid_weight) * lexical_overlap

                results.append(
                    (
                        score,
                        {
                            "document_id": document_id,
                            "chunk": chunk,
                            "metadata": chunk_metadata,
                            "score": score,
                        },
                    )
                )

        results.sort(key=lambda item: item[0], reverse=True)
        return [payload for _, payload in results[:top_k]]

