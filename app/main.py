"""FastAPI application factory for the research RAG system."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import router as api_router
from app.api.dependencies import get_settings
from app.services.vector_store import LocalVectorStore
from app.utils.chunking import Chunk
from app.utils.embedding import EmbeddingService


def _seed_sample_documents(settings) -> None:
    vector_store = LocalVectorStore(settings.vector_store_path)
    if vector_store.list_documents():
        return

    samples = [
        {
            "document_id": "sample-glp1",
            "filename": "glp1-summary.txt",
            "metadata": {
                "title": "GLP-1 Agonists and Cardiometabolic Health",
                "authors": "Smith J; Chen L",
                "journal": "Journal of Metabolic Science",
                "year": "2024",
            },
            "chunks": [
                "Recent randomized trials report that weekly GLP-1 receptor agonists reduce HbA1c by approximately 1.2% and support meaningful weight loss in patients with type 2 diabetes.",
                "Cardiovascular outcomes trials suggest a 15-20% relative risk reduction in major adverse cardiac events among high-risk populations receiving long-acting formulations.",
            ],
        },
        {
            "document_id": "sample-oncology",
            "filename": "oncology-overview.txt",
            "metadata": {
                "title": "Emerging Trends in Oncology",
                "authors": "Rahman A; Patel R",
                "journal": "Global Oncology Review",
                "year": "2023",
            },
            "chunks": [
                "Checkpoint inhibitor combinations continue to demonstrate durable responses in metastatic melanoma, with five-year survival approaching 50% in selected cohorts.",
                "Liquid biopsy adoption is accelerating: circulating tumor DNA assays now inform minimal residual disease monitoring across several solid tumors.",
            ],
        },
        {
            "document_id": "sample-diabetes",
            "filename": "diabetes-care.txt",
            "metadata": {
                "title": "Comprehensive Type 2 Diabetes Care 2024",
                "authors": "Nguyen P; Rodriguez M",
                "journal": "International Diabetes Quarterly",
                "year": "2024",
            },
            "chunks": [
                "Updated ADA/EASD consensus highlights early combination therapy, incorporating SGLT2 inhibitors or GLP-1 receptor agonists for patients with cardiovascular or renal comorbidities.",
                "Continuous glucose monitoring has become standard of care for insulin-treated adults, improving time-in-range metrics and reducing hypoglycemia episodes.",
            ],
        },
        {
            "document_id": "sample-alzheimers",
            "filename": "alzheimers-innovations.txt",
            "metadata": {
                "title": "Advances in Alzheimer’s Disease Therapeutics",
                "authors": "Garcia L; Thompson E",
                "journal": "Neurology Frontiers",
                "year": "2024",
            },
            "chunks": [
                "Anti-amyloid monoclonal antibodies such as lecanemab demonstrate modest slowing of cognitive decline in early-stage Alzheimer’s disease when paired with lifestyle interventions.",
                "Digital cognitive assessments and blood-based biomarkers (p-tau217, NFL) are improving early detection and trial stratification for neurodegenerative conditions.",
            ],
        },
    ]

    for sample in samples:
        chunks = []
        embeddings = []
        for idx, content in enumerate(sample["chunks"]):
            chunk_metadata = {
                **sample["metadata"],
                "document_id": sample["document_id"],
                "chunk_position": str(idx),
            }
            chunk = Chunk(content=content, position=idx, metadata=chunk_metadata)
            chunks.append(chunk)
            embeddings.append(EmbeddingService.generate_local_embedding(content))

        vector_store.add_document(
            document_id=sample["document_id"],
            filename=sample["filename"],
            document_metadata={**sample["metadata"], "document_id": sample["document_id"]},
            chunks=chunks,
            embeddings=embeddings,
        )


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
    )

    if settings.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(api_router, prefix=settings.api_prefix)

    @app.on_event("startup")
    async def startup_event() -> None:  # pragma: no cover - FastAPI hook
        logging.getLogger(__name__).info("Starting %s", settings.app_name)
        _seed_sample_documents(settings)

    return app


app = create_app()


