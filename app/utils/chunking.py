"""Utilities for transforming raw documents into semantically coherent chunks.

The chunking strategy implemented here favours paragraph/section boundaries,
supports configurable overlap, and retains metadata to maintain provenance
throughout the ingestion and retrieval pipeline.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional


def _normalise_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


@dataclass
class Chunk:
    """Represents a chunk of text derived from a source document."""

    content: str
    position: int
    metadata: Dict[str, str]
    chunk_id: str = field(default_factory=lambda: str(uuid.uuid4()))


class Chunker:
    """Paragraph-aware chunking with overlap and metadata preservation."""

    def __init__(
        self,
        max_characters: int,
        overlap: int,
        max_tokens: int,
        approx_tokens_per_char: float = 0.25,
    ) -> None:
        if overlap >= max_characters:
            raise ValueError("Overlap must be smaller than the maximum chunk size")

        self.max_characters = max_characters
        self.overlap = overlap
        self.max_tokens = max_tokens
        self.approx_tokens_per_char = approx_tokens_per_char

    def split_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs while respecting headings and tables."""

        # Preserve table-like structures by converting multiple spaces to tabs for detection
        text = text.replace("\t", "    ")
        paragraphs = re.split(r"\n{2,}", text)
        cleaned = []
        buffer: List[str] = []

        for paragraph in paragraphs:
            candidate = paragraph.strip()
            if not candidate:
                continue

            # Keep table rows together
            if re.search(r"(?:\|\s{2,}|\t)", candidate) and buffer:
                buffer.append(candidate)
                cleaned.append("\n".join(buffer))
                buffer = []
                continue

            if candidate.endswith(":"):
                buffer.append(candidate)
                continue

            if buffer:
                buffer.append(candidate)
                cleaned.append(" ".join(buffer))
                buffer = []
            else:
                cleaned.append(candidate)

        if buffer:
            cleaned.append(" ".join(buffer))

        return cleaned

    def _too_many_tokens(self, text: str) -> bool:
        approx_tokens = len(text) * self.approx_tokens_per_char
        return approx_tokens > self.max_tokens

    def _split_long_paragraph(self, paragraph: str) -> Iterable[str]:
        words = paragraph.split()
        chunk_words: List[str] = []

        for word in words:
            chunk_words.append(word)
            current_chunk = " ".join(chunk_words)
            if len(current_chunk) > self.max_characters or self._too_many_tokens(current_chunk):
                yield current_chunk
                overlap_words = chunk_words[-self.overlap :] if self.overlap else []
                chunk_words = list(overlap_words)

        if chunk_words:
            yield " ".join(chunk_words)

    def chunk(
        self,
        text: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> List[Chunk]:
        """Generate chunks with preserved metadata.

        Args:
            text: Raw text extracted from a document.
            metadata: Metadata associated with the document (e.g., authors, year).

        Returns:
            List of Chunk objects ready for embedding and indexing.
        """

        if not text:
            return []

        metadata = metadata or {}
        paragraphs = self.split_paragraphs(text)
        chunks: List[Chunk] = []
        buffer = ""
        position = 0

        for paragraph in paragraphs:
            paragraph = _normalise_whitespace(paragraph)
            if not paragraph:
                continue

            if len(paragraph) > self.max_characters or self._too_many_tokens(paragraph):
                for sub_chunk in self._split_long_paragraph(paragraph):
                    chunks.append(
                        Chunk(
                            content=sub_chunk,
                            position=position,
                            metadata={**metadata, "chunk_position": str(position)},
                        )
                    )
                    position += 1
                continue

            candidate = (buffer + " " + paragraph).strip() if buffer else paragraph
            if len(candidate) <= self.max_characters and not self._too_many_tokens(candidate):
                buffer = candidate
                continue

            if buffer:
                chunks.append(
                    Chunk(
                        content=buffer,
                        position=position,
                        metadata={**metadata, "chunk_position": str(position)},
                    )
                )
                position += 1

            buffer = paragraph

        if buffer:
            chunks.append(
                Chunk(
                    content=buffer,
                    position=position,
                    metadata={**metadata, "chunk_position": str(position)},
                )
            )

        return chunks

