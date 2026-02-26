from app.utils.chunking import Chunker


def test_chunker_respects_overlap():
    text = "Paragraph one.\n\nParagraph two is a bit longer than the previous one to trigger splitting." * 5
    chunker = Chunker(max_characters=200, overlap=20, max_tokens=400)
    chunks = chunker.chunk(text, {"document_id": "doc"})
    assert chunks
    assert all("document_id" in chunk.metadata for chunk in chunks)

