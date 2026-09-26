import pymupdf


class PDFExtractionError(Exception):
    """Raised when a PDF cannot be read or has no usable text."""
    pass


def extract_text_from_pdf(file_path):
    """
    Opens a PDF file and extracts all readable text from it.
    Raises PDFExtractionError if the file is corrupted, empty, or unreadable.
    """
    try:
        doc = pymupdf.open(file_path)
    except Exception as e:
        raise PDFExtractionError(f"Could not open PDF file: {e}")

    if doc.page_count == 0:
        doc.close()
        raise PDFExtractionError("The PDF has no pages.")

    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())

    doc.close()

    full_text = "\n".join(text_parts).strip()

    if not full_text:
        raise PDFExtractionError(
            "No readable text found in this PDF. It may be a scanned image without OCR support."
        )

    max_chars = 30000
    if len(full_text) > max_chars:
        full_text = full_text[:max_chars]

    return full_text