# MRS: Medical Research Synthesizer

**Tagline:** *Putting evidence at everyone's fingertips.*

## What it does

MRS is an AI-powered research assistant that answers clinical and public-health questions using real medical literature. You ask in plain language; it retrieves and synthesizes relevant papers, surfaces key findings and limitations, and cites sources so you can verify and dig deeper. It supports PDF/document upload and RAG over your own corpus, so clinicians, researchers, and informed citizens can query evidence without spending hours on search and reading.

## Why it matters

Medical evidence is locked in millions of papers and technical language. That slows down clinicians, limits what patients and caregivers can understand, and widens gaps between those with access to expertise and those without. MRS reduces that gap by making evidence searchable and summarizable in seconds, with clear provenance and citations. It doesn't replace judgment—it supports it with transparent, traceable evidence.

## Social impact

- **Clinicians:** Quick, cited answers for treatment and guideline questions during busy practice.
- **Researchers:** Faster literature review and synthesis for grants and papers.
- **Patients & advocates:** Access to understandable, sourced summaries to participate in care decisions.
- **Public health:** Easier synthesis of emerging evidence for policy and outreach.

---

## Features

- Document ingestion pipeline with PDF/DOCX/TXT extraction, smart chunking, AWS S3 storage, and a lightweight JSON vector index.
- Hybrid retrieval combining semantic vector search with simple lexical re-ranking and metadata filters.
- Evidence-based response generation using AWS Bedrock (Claude 3 + Titan embeddings) with structured outputs and citations.
- Metrics, health checks, and admin endpoints for operational visibility.
- Optional AWS Cognito authentication integration.

## Architecture

- **API**: FastAPI application (`app/main.py`) deployable on Lambda, Fargate, or EC2.
- **Vector Store**: JSON-backed embedding index stored on disk (`data/vector_store.json` by default).
- **Storage**: Amazon S3 for raw document storage.
- **Models**: AWS Bedrock (Claude 3 for generation, Titan embeddings for retrieval).
- **Authentication**: AWS Cognito (optional).

```
Ingestion → Chunking → Embedding → Vector Store/S3
Query → Embedding → Hybrid Scoring → Bedrock → Structured Answer + Citations
```

## Getting Started

1. Copy `config/env.example` to `.env` and fill in AWS credentials, S3 bucket, and (optionally) override the vector store path.
2. (Optional) Launch local dependencies:

   ```bash
   docker compose up --build
   ```

3. Install dependencies and run the API locally:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

### Frontend UI

The `frontend/` directory contains a React + Vite dashboard for interacting with the API.

1. Copy `frontend/env.example` to `frontend/.env` and set `VITE_API_BASE_URL` (defaults to `/api` when using the Vite proxy).
2. Install dependencies and start the dev server:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Update the backend `.env` to include the frontend origin for local development:

   ```env
   ALLOWED_ORIGINS='["http://localhost:5173"]'
   ```

The app proxies `/api/*` requests to the FastAPI server via Vite during development. For production, build the frontend (`npm run build`) and deploy separately or behind the same gateway.

## API Overview

- `POST /api/documents/upload` – upload single document (multipart form).
- `POST /api/documents/batch` – bulk ingest pre-parsed documents.
- `GET /api/documents` – list indexed documents.
- `DELETE /api/documents/{doc_id}` – remove document and related chunks.
- `POST /api/query` – answer research question with citations.
- `POST /api/query/chat` – conversational follow-up.
- `GET /api/query/history` – retrieve recent queries.
- `GET /api/health` – service health status.
- `GET /api/metrics` – latency and indexing metrics.
- `POST /api/admin/reindex` – no-op placeholder for compatibility (vector store self-manages).

## Deployment

- **Docker**: Multi-stage Dockerfile targeting AWS Lambda runtime.
- **Serverless**: Use AWS SAM/Serverless/Terraform (see `infrastructure/`) to provision Lambda, API Gateway, S3, IAM roles. Store the vector index on EFS/S3 or rebuild on startup as needed.
- **Environment Variables**: All secrets configurable via `.env`, SSM Parameter Store, or AWS Secrets Manager.

## Testing

```bash
pytest
```

Add integration tests for AWS services before production deployment. Performance and accuracy testing should be conducted against representative corpora.

## Extending

- Implement `infrastructure/` templates for IaC (CloudFormation/Terraform).
- Integrate rate limiting, advanced monitoring (e.g., CloudWatch dashboards), and detailed audit logging.
- Add conflict detection heuristics and human-in-the-loop review workflows.


