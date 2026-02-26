"""Document ingestion pipeline for the research RAG system."""

from __future__ import annotations

import hashlib
import io
import logging
import mimetypes
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.services.vector_store import LocalVectorStore
from app.utils.chunking import Chunk, Chunker
from app.utils.embedding import EmbeddingService

logger = logging.getLogger(__name__)


try:
    import pdfplumber
except ImportError:  # pragma: no cover - optional dependency
    pdfplumber = None

try:
    import docx
except ImportError:  # pragma: no cover - optional dependency
    docx = None


@dataclass
class IngestionResult:
    document_id: str
    chunks_indexed: int
    duplicate: bool


class DocumentIngestionService:
    """High-level service coordinating document ingestion."""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        chunker: Chunker,
        s3_client: Optional[boto3.client] = None,
        vector_store: Optional[LocalVectorStore] = None,
    ) -> None:
        self.embedding_service = embedding_service
        self.chunker = chunker
        self.s3_client = s3_client or boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            aws_session_token=settings.aws_session_token,
            region_name=settings.aws_region,
        )
        self.vector_store = vector_store or LocalVectorStore(settings.vector_store_path)

    def ingest_document(
        self,
        document_stream: io.BytesIO,
        filename: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> IngestionResult:
        metadata = metadata or {}
        extension = self._detect_extension(filename)
        if extension not in settings.supported_file_types:
            raise ValueError(f"Unsupported file type: {extension}")

        document_bytes = document_stream.read()
        document_hash = self._hash_document(document_bytes)

        duplicate = self._check_duplicate(document_hash)
        if duplicate:
            logger.info("Duplicate document detected: %s", filename)
            return IngestionResult(document_id=document_hash, chunks_indexed=0, duplicate=True)

        text, extracted_metadata = self._extract_text_and_metadata(document_bytes, extension)
        combined_metadata = {**metadata, **extracted_metadata, "document_id": document_hash}

        chunks = self.chunker.chunk(text, combined_metadata)
        if not chunks:
            raise ValueError("Document produced no chunks after processing")

        embeddings = self.embedding_service.embed(chunk.content for chunk in chunks)

        self._upload_to_s3(document_bytes, filename, combined_metadata)
        self.vector_store.add_document(
            document_id=document_hash,
            filename=filename,
            document_metadata=combined_metadata,
            chunks=chunks,
            embeddings=embeddings,
        )

        return IngestionResult(
            document_id=document_hash,
            chunks_indexed=len(chunks),
            duplicate=False,
        )

    def ingest_batch(
        self,
        documents: Iterable[Tuple[io.BytesIO, str, Dict[str, str]]],
    ) -> List[IngestionResult]:
        results: List[IngestionResult] = []
        for stream, filename, metadata in documents:
            try:
                results.append(self.ingest_document(stream, filename, metadata))
            except Exception as exc:  # pragma: no cover - robust pipeline requirement
                logger.exception("Failed to ingest %s: %s", filename, exc)
        return results

    def _upload_to_s3(
        self,
        document_bytes: bytes,
        filename: str,
        metadata: Dict[str, str],
    ) -> None:
        key = f"{settings.s3_prefix}{metadata.get('document_id')}/{filename}"
        try:
            self.s3_client.put_object(
                Bucket=settings.s3_bucket,
                Key=key,
                Body=document_bytes,
                Metadata=metadata,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.exception("Failed to upload %s to S3: %s", filename, exc)
            raise

    def remove_document(self, document_id: str) -> bool:
        removed = self.vector_store.remove_document(document_id)

        prefix = f"{settings.s3_prefix}{document_id}/"
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=settings.s3_bucket,
                Prefix=prefix,
            )
            objects = response.get("Contents", [])
            if objects:
                delete_payload = {"Objects": [{"Key": obj["Key"]} for obj in objects]}
                self.s3_client.delete_objects(Bucket=settings.s3_bucket, Delete=delete_payload)
        except (BotoCoreError, ClientError) as exc:  # pragma: no cover - external AWS path
            logger.warning("Failed to clean up S3 objects for %s: %s", document_id, exc)

        return removed

    def _check_duplicate(self, document_hash: str) -> bool:
        return self.vector_store.has_document(document_hash)

    def _hash_document(self, document_bytes: bytes) -> str:
        digest = hashlib.sha256(document_bytes).hexdigest()
        return digest

    def _detect_extension(self, filename: str) -> str:
        extension = mimetypes.guess_extension(mimetypes.guess_type(filename)[0] or "")
        if not extension and "." in filename:
            extension = filename[filename.rfind(".") :].lower()
        return extension or ""

    def _extract_text_and_metadata(self, document_bytes: bytes, extension: str) -> Tuple[str, Dict[str, str]]:
        if extension == ".pdf":
            return self._extract_pdf(document_bytes)
        if extension == ".docx":
            return self._extract_docx(document_bytes)
        return document_bytes.decode("utf-8", errors="ignore"), {}

    def _extract_pdf(self, document_bytes: bytes) -> Tuple[str, Dict[str, str]]:
        if pdfplumber is None:
            raise RuntimeError("pdfplumber is required for PDF ingestion")

        metadata: Dict[str, str] = {}
        text_parts: List[str] = []
        with pdfplumber.open(io.BytesIO(document_bytes)) as pdf:
            doc_metadata = pdf.metadata or {}
            for key in ["Title", "Author", "Subject", "Creator", "Producer", "CreationDate"]:
                value = doc_metadata.get(key)
                if value:
                    metadata[key.lower()] = str(value)
            for page_number, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
                metadata[f"page_{page_number}_chars"] = str(len(page_text))

        return "\n".join(text_parts), metadata

    def _extract_docx(self, document_bytes: bytes) -> Tuple[str, Dict[str, str]]:
        if docx is None:
            raise RuntimeError("python-docx is required for DOCX ingestion")

        document = docx.Document(io.BytesIO(document_bytes))
        paragraphs = [paragraph.text for paragraph in document.paragraphs]
        core_properties = document.core_properties
        metadata = {
            "title": core_properties.title or "",
            "author": core_properties.author or "",
            "created": core_properties.created.isoformat() if core_properties.created else "",
        }
        return "\n".join(paragraphs), metadata

