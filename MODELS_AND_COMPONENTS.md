# Models and Components Specification

## Overview

This is a **Retrieval-Augmented Generation (RAG) system** that uses **pre-trained models** from AWS Bedrock. The system does **NOT** perform pretraining or finetuning. All models are used as-is from AWS Bedrock's managed service.

---

## AI Models Used

### 1. **Text Generation Model (LLM)**

**Model:** Anthropic Claude 3 Sonnet  
**Model ID:** `anthropic.claude-3-sonnet-20240229-v1:0`  
**Provider:** AWS Bedrock (Anthropic)  
**Purpose:** Generate evidence-based answers to research questions

**Configuration:**
- **Max Tokens:** 4,096 (configurable via `BEDROCK_MAX_TOKENS`)
- **Temperature:** 0.2 (configurable via `BEDROCK_TEMPERATURE`)
  - Low temperature for more deterministic, factual responses
- **System Prompt:** Medical research assistant with citation requirements
- **Output Format:** JSON-structured responses with:
  - Summary (answer)
  - Evidence statements
  - Conflicts/limitations
  - Confidence score

**Usage:**
- Invoked via `BedrockClient.invoke_text_model()`
- Receives retrieved document chunks as context
- Generates structured JSON responses
- Fallback mechanism if Bedrock is unavailable

**Location in Code:**
- `app/services/generation.py` - GenerationService
- `app/services/bedrock_client.py` - BedrockClient

---

### 2. **Embedding Model**

**Model:** Amazon Titan Embed Text  
**Model ID:** `amazon.titan-embed-text-v1` (default) or `amazon.titan-embed-text-v2`  
**Provider:** AWS Bedrock (Amazon)  
**Purpose:** Generate vector embeddings for document chunks and queries

**Specifications:**
- **Embedding Dimension:** 128 (for fallback), actual Titan embeddings are typically 1024 or 1536 dimensions
- **Batch Size:** 10 texts per API call (configurable)
- **Usage:** 
  - Document ingestion: Embed all chunks during indexing
  - Query processing: Embed user questions for semantic search

**Fallback Mechanism:**
- If Bedrock fails, uses deterministic pseudo-embeddings (SHA256-based)
- Fallback dimension: 128
- Ensures system continues operating without Bedrock access

**Location in Code:**
- `app/utils/embedding.py` - EmbeddingService
- `app/services/bedrock_client.py` - BedrockClient.invoke_embedding_model()

---

## Data Processing Components

### 3. **Text Chunking Strategy**

**Type:** Rule-based text processing (not ML-based)  
**Purpose:** Split documents into semantically meaningful chunks

**Configuration:**
- **Chunk Size:** 1,024 characters (configurable via `CHUNK_SIZE`)
- **Chunk Overlap:** 128 characters (configurable via `CHUNK_OVERLAP`)
- **Max Tokens per Chunk:** 800 (configurable via `MAX_CHUNK_TOKENS`)

**Strategy:**
- Paragraph-aware splitting
- Preserves metadata (title, authors, journal, year, etc.)
- Maintains overlap between chunks for context continuity

**Location in Code:**
- `app/utils/chunking.py` - Chunker class

---

### 4. **Hybrid Search Algorithm**

**Type:** Combination of vector similarity + lexical matching  
**Purpose:** Retrieve relevant document chunks for queries

**Components:**
1. **Vector Similarity:** Cosine similarity between query embedding and chunk embeddings
2. **Lexical Overlap:** Token-based matching (simple word overlap)
3. **Hybrid Weight:** 0.6 (60% vector, 40% lexical) - configurable via `HYBRID_SEARCH_WEIGHT`

**Retrieval Parameters:**
- **Max Results:** 25 (configurable via `MAX_RETRIEVAL_RESULTS`)
- **Rerank Top K:** 10 (configurable via `RERANK_TOP_K`)
- **Metadata Filters:** year, journal, authors (configurable)

**Location in Code:**
- `app/services/retrieval.py` - RetrievalService
- `app/services/vector_store.py` - LocalVectorStore.search()

---

## Storage Components

### 5. **Vector Store**

**Type:** Local JSON-backed in-memory store  
**Purpose:** Store document chunks with embeddings for fast retrieval

**Specifications:**
- **Storage Format:** JSON file (`data/vector_store.json` by default)
- **Threading:** Uses `threading.Lock()` for concurrent access
- **Structure:**
  ```json
  {
    "documents": {
      "document_id": {
        "filename": "...",
        "metadata": {...},
        "chunks": [
          {
            "chunk_id": "...",
            "content": "...",
            "position": 0,
            "metadata": {...}
          }
        ],
        "embeddings": [[...], [...]]
      }
    }
  }
  ```

**Operations:**
- `add_document()` - Add new document with chunks and embeddings
- `remove_document()` - Delete document
- `search()` - Hybrid search with filters
- `list_documents()` - List all indexed documents
- `has_document()` - Check for duplicates

**Location in Code:**
- `app/services/vector_store.py` - LocalVectorStore class

---

### 6. **Document Storage (S3)**

**Service:** Amazon S3  
**Purpose:** Store raw uploaded documents (PDF, DOCX, TXT)

**Configuration:**
- **Bucket:** Configurable via `S3_BUCKET`
- **Prefix:** `documents/` (configurable via `S3_PREFIX`)
- **Multipart Chunk Size:** 32 MB (configurable)

**Location in Code:**
- `app/services/ingestion.py` - DocumentIngestionService

---

## What This System Does NOT Do

### ❌ Pretraining
- **No model pretraining** - All models are pre-trained by AWS/Anthropic
- Models are used as-is from AWS Bedrock

### ❌ Finetuning
- **No model finetuning** - No custom training on medical data
- System relies on pre-trained models' general knowledge
- Domain-specific knowledge comes from ingested documents (RAG approach)

### ❌ Custom Model Training
- **No training infrastructure** - No PyTorch/TensorFlow training code
- No gradient computation or backpropagation
- No model checkpoints or training loops

---

## System Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    USER QUERY                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Embedding Service    │  ← Amazon Titan Embeddings
         │  (Query → Vector)     │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Retrieval Service    │  ← Hybrid Search (Vector + Lexical)
         │  (Vector Store)       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Generation Service    │  ← Claude 3 Sonnet
         │  (Context → Answer)    │
         └───────────┬───────────┘
                     │
                     ▼
              ┌──────────────┐
              │   Response   │
              │  + Citations │
              └──────────────┘
```

---

## Model Configuration Files

### Environment Variables (`.env`)
- `BEDROCK_MODEL_ID` - Claude 3 Sonnet model ID
- `EMBEDDING_MODEL_ID` - Titan embedding model ID
- `BEDROCK_MAX_TOKENS` - Max output tokens
- `BEDROCK_TEMPERATURE` - Generation temperature

### Configuration Class
- `app/core/config.py` - Settings class with all model parameters

---

## Fallback Mechanisms

### 1. Embedding Fallback
- If Bedrock embedding fails → Deterministic pseudo-embeddings
- Uses SHA256 hash of text as seed
- Dimension: 128 (vs. actual Titan embeddings)

### 2. Generation Fallback
- If Bedrock generation fails → Heuristic summarization
- Concatenates top retrieved chunks
- Confidence score: 0.25 (indicates fallback)
- No LLM processing in fallback mode

---

## Performance Characteristics

### Embedding Generation
- **Batch Size:** 10 texts per API call
- **Retry Logic:** 3 attempts with exponential backoff
- **Latency:** Depends on AWS Bedrock API response time

### Text Generation
- **Max Tokens:** 4,096 (configurable)
- **Temperature:** 0.2 (low for factual responses)
- **System Prompt:** Medical research assistant persona
- **Structured Output:** JSON format enforced

### Vector Search
- **Algorithm:** Cosine similarity + lexical overlap
- **Hybrid Weight:** 0.6 (vector) + 0.4 (lexical)
- **Top K Retrieval:** 25 candidates, reranked to top 10

---

## Model Versions and Updates

### Current Versions
- **Claude 3 Sonnet:** `20240229-v1:0` (February 2024)
- **Titan Embeddings:** `v1` or `v2` (configurable)

### Updating Models
- Change `BEDROCK_MODEL_ID` or `EMBEDDING_MODEL_ID` in `.env`
- No code changes required
- Models are managed by AWS Bedrock

---

## Summary

**This is a RAG system using:**
1. ✅ **Pre-trained Claude 3 Sonnet** for text generation
2. ✅ **Pre-trained Titan Embeddings** for semantic search
3. ✅ **Rule-based chunking** for document processing
4. ✅ **Hybrid search** combining vector + lexical matching
5. ✅ **Local vector store** for fast retrieval

**This is NOT:**
- ❌ A training system (no pretraining/finetuning)
- ❌ A custom model development platform
- ❌ A system that modifies model weights

The system leverages pre-trained models' capabilities and augments them with domain-specific documents through RAG architecture.

