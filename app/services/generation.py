"""Evidence-based response generation using AWS Bedrock models."""

from __future__ import annotations

import json
import logging
import time
from typing import Dict, List

from app.core.config import settings
from app.models.schemas import ResearchQuery, ResearchResponse
from app.services.bedrock_client import BedrockClient
from app.services.retrieval import RetrievedDocument
from app.utils.citation import build_citation_metadata, deduplicate_citations

logger = logging.getLogger(__name__)


class GenerationService:
    def __init__(self, bedrock_client: BedrockClient) -> None:
        self._client = bedrock_client

    def generate(
        self,
        query: ResearchQuery,
        documents: List[RetrievedDocument],
    ) -> ResearchResponse:
        if not documents:
            raise ValueError("No documents supplied for response generation")

        prompt = self._build_prompt(query, documents)
        start_time = time.perf_counter()

        try:
            response = self._client.invoke_text_model(
                model_id=settings.bedrock_model_id,
                prompt=prompt,
                temperature=settings.bedrock_temperature,
                max_tokens=settings.bedrock_max_tokens,
                system_prompt=self._system_prompt(),
            )
        except Exception as exc:  # pragma: no cover - external service path
            logger.warning("Bedrock generation failed; using heuristic fallback: %s", exc)
            duration = time.perf_counter() - start_time
            return self._fallback_response(query, documents, duration)

        duration = time.perf_counter() - start_time
        parsed = self._parse_response(response)
        if not parsed:
            logger.warning("Bedrock response unparsable; using heuristic fallback")
            return self._fallback_response(query, documents, duration)

        citations = [doc.citation for doc in documents]
        unique_citations = deduplicate_citations(citations)

        return ResearchResponse(
            answer=parsed.get("summary", ""),
            evidence=parsed.get("evidence", []),
            limitations=parsed.get("limitations", []),
            sources=unique_citations,
            confidence=float(parsed.get("confidence", 0.0)),
            query_time=duration,
            total_sources=len(documents),
            metadata={"citations": build_citation_metadata(unique_citations)},
        )

    def _system_prompt(self) -> str:
        return (
            "You are an expert medical research assistant. Provide factual, "
            "evidence-backed answers. Always cite the supporting evidence "
            "and highlight conflicting findings or uncertainties."
        )

    def _build_prompt(self, query: ResearchQuery, documents: List[RetrievedDocument]) -> str:
        context_blocks = []
        for idx, doc in enumerate(documents, start=1):
            metadata = doc.metadata
            block = {
                "id": doc.chunk_id,
                "title": metadata.get("title", "Unknown Title"),
                "journal": metadata.get("journal", ""),
                "year": metadata.get("year", ""),
                "authors": metadata.get("authors", ""),
                "content": doc.content,
            }
            context_blocks.append(block)

        prompt_payload = {
            "question": query.question,
            "context": context_blocks,
            "instructions": {
                "format": "json",
                "fields": {
                    "summary": "Concise answer grounded in evidence.",
                    "evidence": "List of key evidence statements with source IDs.",
                    "conflicts": "Conflicting findings with explanations if present.",
                    "limitations": "Study limitations or data quality issues.",
                    "confidence": "Overall confidence score between 0 and 1.",
                },
            },
        }

        return json.dumps(prompt_payload)

    def _parse_response(self, response: Dict) -> Dict:
        output = response.get("output", {}) if response else {}
        if isinstance(output, str):
            try:
                output = json.loads(output)
            except json.JSONDecodeError:
                logger.warning("Model output was not JSON. Returning empty structure.")
                return {}

        if "content" in output and isinstance(output["content"], str):
            try:
                return json.loads(output["content"])
            except json.JSONDecodeError:
                logger.warning("Model content payload is not valid JSON")
                return {}

        return output

    def _fallback_response(
        self,
        query: ResearchQuery,
        documents: List[RetrievedDocument],
        duration: float,
    ) -> ResearchResponse:
        top_documents = documents[: min(len(documents), 3)]
        summary_sentences = [doc.content for doc in top_documents]
        summary = " ".join(summary_sentences) or "No contextual evidence available."

        citations = deduplicate_citations([doc.citation for doc in top_documents])
        evidence = summary_sentences

        return ResearchResponse(
            answer=f"Heuristic summary for query '{query.question}': {summary}",
            evidence=evidence,
            limitations=["Response generated without Bedrock; content heuristically summarised."],
            conflicts=[],
            sources=citations,
            confidence=0.25,
            query_time=duration,
            total_sources=len(documents),
            metadata={"citations": build_citation_metadata(citations), "fallback": True},
        )

