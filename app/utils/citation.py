"""Citation formatting and provenance utilities."""

from __future__ import annotations

from collections import OrderedDict
from typing import Iterable, List

from app.models.schemas import Citation


def format_citation(citation: Citation) -> str:
    """Return a human-readable citation string."""

    authors = ", ".join(citation.authors)
    base = f"{authors} ({citation.year}). {citation.paper_title}. {citation.journal}."
    if citation.page_number is not None:
        base += f" p.{citation.page_number}"
    return base


def deduplicate_citations(citations: Iterable[Citation]) -> List[Citation]:
    """Remove duplicate citations while combining confidence scores."""

    unique: "OrderedDict[str, Citation]" = OrderedDict()
    for entry in citations:
        key = entry.id
        if key not in unique:
            unique[key] = entry
            continue
        existing = unique[key]
        combined_confidence = max(existing.confidence, entry.confidence)
        unique[key] = existing.copy(update={"confidence": combined_confidence})
    return list(unique.values())


def build_citation_metadata(citations: Iterable[Citation]) -> List[dict]:
    """Create metadata payload for API responses and logging."""

    result: List[dict] = []
    for citation in deduplicate_citations(citations):
        result.append(
            {
                "id": citation.id,
                "excerpt": citation.excerpt,
                "confidence": citation.confidence,
                "formatted": format_citation(citation),
            }
        )
    return result

