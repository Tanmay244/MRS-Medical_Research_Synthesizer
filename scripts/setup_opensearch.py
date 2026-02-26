"""Utility script to initialise the OpenSearch index."""

import json

from app.api.dependencies import get_opensearch_client, get_settings


def create_index() -> None:
    settings = get_settings()
    client = get_opensearch_client()

    body = {
        "settings": {
            "index": {
                "number_of_shards": settings.opensearch_shards,
                "number_of_replicas": settings.opensearch_replicas,
            },
        },
        "mappings": {
            "properties": {
                "content": {"type": "text"},
                "vector_embedding": {
                    "type": "dense_vector",
                    "dims": 1536,
                },
                "metadata": {
                    "properties": {
                        "document_id": {"type": "keyword"},
                        "title": {"type": "text"},
                        "authors": {"type": "keyword"},
                        "journal": {"type": "keyword"},
                        "year": {"type": "integer"},
                        "chunk_position": {"type": "integer"},
                    }
                },
            }
        },
    }

    if client.indices.exists(index=settings.opensearch_index_name):
        print(f"Index {settings.opensearch_index_name} already exists")
        return

    client.indices.create(index=settings.opensearch_index_name, body=body)
    print(f"Created index {settings.opensearch_index_name}")


if __name__ == "__main__":
    create_index()


