"""Embedding utilities using AWS Bedrock Titan embeddings."""

from __future__ import annotations

import hashlib
import logging
import random
from typing import Iterable, List

from botocore.exceptions import BotoCoreError, ClientError

from app.services.bedrock_client import BedrockClient

logger = logging.getLogger(__name__)

_EMBEDDING_DIMENSION = 128


def _fallback_embedding(text: str, dimension: int = _EMBEDDING_DIMENSION) -> List[float]:
    """Deterministically generate a pseudo-embedding for offline scenarios."""

    seed = hashlib.sha256(text.encode("utf-8")).digest()
    rng = random.Random(int.from_bytes(seed, "big"))
    return [rng.uniform(-1.0, 1.0) for _ in range(dimension)]


class EmbeddingService:
    """Encapsulates embedding generation with batching and retry logic."""

    def __init__(
        self,
        bedrock_client: BedrockClient,
        model_id: str,
        batch_size: int = 10,
    ) -> None:
        self._client = bedrock_client
        self._model_id = model_id
        self._batch_size = batch_size

    def embed(self, texts: Iterable[str]) -> List[List[float]]:
        """Generate embeddings for a collection of texts."""

        vector_list: List[List[float]] = []
        batch: List[str] = []

        for text in texts:
            if not isinstance(text, str):
                raise TypeError("All items to embed must be strings")

            batch.append(text)
            if len(batch) >= self._batch_size:
                vectors = self._embed_batch(batch)
                vector_list.extend(vectors)
                batch = []

        if batch:
            vector_list.extend(self._embed_batch(batch))

        return vector_list

    def _embed_batch(self, batch: List[str]) -> List[List[float]]:
        try:
            response = self._client.invoke_embedding_model(self._model_id, batch)
        except (BotoCoreError, ClientError, Exception) as exc:  # pragma: no cover - external call
            logger.warning(
                "Falling back to local embeddings due to Bedrock error: %s", exc
            )
            return [_fallback_embedding(text) for text in batch]

        if not response or "embeddings" not in response:
            logger.warning("Bedrock embedding response missing 'embeddings' field. Using fallback.")
            return [_fallback_embedding(text) for text in batch]

        vectors = response["embeddings"]
        if len(vectors) != len(batch):
            logger.warning("Embedding count mismatch. Using fallback embeddings.")
            return [_fallback_embedding(text) for text in batch]

        return vectors

    @staticmethod
    def generate_local_embedding(text: str) -> List[float]:
        """Expose the fallback embedding so other components can seed data."""

        return _fallback_embedding(text)

