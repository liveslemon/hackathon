"""
OCR fallback for scanned / image-only CVs.

pdfplumber returns no text for scanned PDFs. When that happens we render the
first pages to JPEG with pypdfium2 (already installed with pdfplumber) and ask
Gemini, the configured provider with image input, to transcribe them.
"""

from __future__ import annotations

import asyncio
import base64
import io
import logging

from openai import AsyncOpenAI

from core.config import settings

logger = logging.getLogger(__name__)

MAX_OCR_PAGES = 3
RENDER_SCALE = 2.0  # ~144 dpi: legible for OCR, small enough to upload

_PROMPT = (
    "These images are pages of a student's CV. Transcribe all of the text "
    "exactly as written, top to bottom, keeping section headings and bullet "
    "points on their own lines. Output only the transcribed text."
)


def _render_pages(pdf_bytes: bytes, max_pages: int) -> list[str]:
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(pdf_bytes)
    try:
        images = []
        for index in range(min(len(pdf), max_pages)):
            bitmap = pdf[index].render(scale=RENDER_SCALE)
            buf = io.BytesIO()
            bitmap.to_pil().convert("RGB").save(buf, format="JPEG", quality=80)
            images.append(base64.b64encode(buf.getvalue()).decode())
        return images
    finally:
        pdf.close()


async def ocr_pdf(pdf_bytes: bytes) -> str:
    """Best-effort text from a scanned PDF. Returns "" if OCR isn't available or fails."""
    if not settings.GEMINI_API_KEY:
        return ""
    try:
        images = await asyncio.to_thread(_render_pages, pdf_bytes, MAX_OCR_PAGES)
        if not images:
            return ""
        client = AsyncOpenAI(
            api_key=settings.GEMINI_API_KEY,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            default_headers={"x-goog-api-key": settings.GEMINI_API_KEY},
            timeout=60.0,
            max_retries=0,
        )
        content = [{"type": "text", "text": _PROMPT}] + [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img}"}}
            for img in images
        ]
        response = await client.chat.completions.create(
            model=settings.GEMINI_MODEL,
            messages=[{"role": "user", "content": content}],
            max_tokens=4000,
            temperature=0,
        )
        text = (response.choices[0].message.content or "").strip()
        logger.info(f"[OCR] Transcribed {len(images)} page(s), {len(text)} chars")
        return text
    except Exception as e:
        logger.warning(f"[OCR] Failed: {e}")
        return ""
