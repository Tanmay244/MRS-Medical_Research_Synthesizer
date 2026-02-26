"""Batch ingestion helper for local datasets."""

import argparse
import io
import pathlib

from app.api.dependencies import get_ingestion_service


def ingest_directory(path: pathlib.Path) -> None:
    ingestion_service = get_ingestion_service()
    documents = []
    for file_path in path.glob("**/*"):
        if file_path.is_dir():
            continue
        with file_path.open("rb") as handle:
            documents.append((io.BytesIO(handle.read()), file_path.name, {}))

    results = ingestion_service.ingest_batch(documents)
    for result in results:
        print(result)


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch ingest documents")
    parser.add_argument("path", type=pathlib.Path)
    args = parser.parse_args()
    ingest_directory(args.path)


if __name__ == "__main__":
    main()


