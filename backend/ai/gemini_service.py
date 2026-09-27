import os
import json
import time

from google import genai
from google.genai import types

from .prompts import SYSTEM_PROMPT, build_user_prompt


class GeminiServiceError(Exception):
    pass


def _get_api_key():
    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        raise GeminiServiceError(
            "GEMINI_API_KEY is not set in the environment."
        )

    return api_key


def _get_client():
    return genai.Client(api_key=_get_api_key())


def _clean_json_text(text):
    """
    Clean Gemini response before JSON parsing.
    Handles normal JSON and markdown code fences.
    """

    if not text:
        return ""

    cleaned = text.strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

    return cleaned.strip()


def _is_retryable_error(error):
    """
    Return True for temporary Gemini/API errors.
    """

    error_text = str(error).upper()

    retryable_keywords = [
        "503",
        "UNAVAILABLE",
        "429",
        "RESOURCE_EXHAUSTED",
        "500",
        "502",
        "504",
        "INTERNAL",
        "TIMEOUT",
    ]

    return any(
        keyword in error_text
        for keyword in retryable_keywords
    )


# ============================================================
# TEXT PDF ANALYSIS
# ============================================================

def analyze_document_text(extracted_text):
    """
    Analyze extracted PDF text using Gemini.

    Always returns a Python dictionary.
    """

    client = _get_client()

    primary_model = os.environ.get(
        "GEMINI_MODEL",
        "gemini-3.5-flash-lite",
    )

    fallback_model = "gemini-3.8-flash"

    models_to_try = [primary_model]

    if fallback_model not in models_to_try:
        models_to_try.append(fallback_model)

    prompt = build_user_prompt(extracted_text)

    last_error = None

    for model_name in models_to_try:

        for attempt in range(1, 4):

            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        max_output_tokens=4096,
                    ),
                )

                text = getattr(response, "text", None)

                if not text:
                    raise GeminiServiceError(
                        f"Gemini returned an empty response "
                        f"(model={model_name})."
                    )

                cleaned = _clean_json_text(text)

                try:
                    parsed = json.loads(cleaned)

                except json.JSONDecodeError as e:
                    raise GeminiServiceError(
                        "Gemini returned invalid JSON for document analysis."
                    ) from e

                if not isinstance(parsed, dict):
                    raise GeminiServiceError(
                        "Gemini returned an unexpected JSON structure."
                    )

                return parsed

            except GeminiServiceError as e:
                last_error = e

                error_text = str(e)

                if "invalid JSON" in error_text.lower():
                    break

                if attempt < 3:
                    time.sleep(2 * attempt)
                    continue

                break

            except Exception as e:
                last_error = e

                if _is_retryable_error(e) and attempt < 3:
                    time.sleep(2 * attempt)
                    continue

                break

    raise GeminiServiceError(
        "Gemini document analysis failed. "
        f"Models tried: {', '.join(models_to_try)}. "
        f"Last error: {type(last_error).__name__}: {last_error}"
    )


# ============================================================
# SCANNED / IMAGE PDF ANALYSIS
# ============================================================

def analyze_document_pdf(pdf_path):
    """
    Analyze a PDF directly with Gemini.

    This is used for scanned/image-only PDFs where normal
    PDF text extraction returns no readable text.

    Gemini receives the original PDF and can inspect the
    visual pages, including scanned report images and tables.
    """

    if not pdf_path:
        raise GeminiServiceError(
            "PDF path was not provided."
        )

    if not os.path.exists(pdf_path):
        raise GeminiServiceError(
            f"PDF file does not exist: {pdf_path}"
        )

    client = _get_client()

    primary_model = os.environ.get(
        "GEMINI_MODEL",
        "gemini-3.8-flash",
    )

    fallback_model = "gemini-3.5-flash-lite"

    models_to_try = [primary_model]

    if fallback_model not in models_to_try:
        models_to_try.append(fallback_model)

    prompt = """
You are HealthMate AI, an assistant for understanding health reports.

The attached file is a PDF health report.

The PDF may be:
1. A normal text PDF, or
2. A scanned/image-only PDF.

IMPORTANT:
Read the actual visual content of every PDF page.
Do NOT depend only on embedded text.
This is especially important when the PDF is a scanned image.

Extract the information that is visibly present in the report.

Return ONLY valid JSON.
Do not use markdown.
Do not write ```json.

The JSON MUST have these top-level fields:

{
  "document_summary": "",
  "key_observations": [],
  "simple_explanations": [],
  "doctor_questions": [],
  "test_results": []
}

Every object inside "test_results" MUST contain:

{
  "test_name": "",
  "value": "",
  "unit": "",
  "reference_range": "",
  "reference_low": null,
  "reference_high": null,
  "explanation": ""
}

IMPORTANT RULES:

1. Inspect all pages of the PDF.
2. Read text from scanned images when necessary.
3. Detect laboratory test names accurately.
4. Extract the reported value accurately.
5. Extract the unit accurately.
6. Extract reference ranges when they are clearly visible.
7. If a reference range is not visible, use:
   "reference_range": "",
   "reference_low": null,
   "reference_high": null
8. Do NOT invent missing values.
9. Preserve values as shown in the report.
10. Do NOT diagnose a disease.
11. Do NOT claim certainty about medical conditions.
12. Explain results in simple language.
13. Include every clearly identifiable laboratory result.
14. Return ONLY the JSON object.
"""

    last_error = None

    for model_name in models_to_try:

        for attempt in range(1, 4):

            uploaded_file = None

            try:
                # Upload the original PDF to Gemini Files API.
                uploaded_file = client.files.upload(
                    file=pdf_path,
                    config=types.UploadFileConfig(
                        mime_type="application/pdf"
                    ),
                )

                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        prompt,
                        uploaded_file,
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        max_output_tokens=4096,
                    ),
                )

                text = getattr(response, "text", None)

                if not text:
                    raise GeminiServiceError(
                        f"Gemini returned an empty response for scanned PDF "
                        f"(model={model_name})."
                    )

                cleaned = _clean_json_text(text)

                try:
                    parsed = json.loads(cleaned)

                except json.JSONDecodeError as e:
                    raise GeminiServiceError(
                        "Gemini returned invalid JSON for scanned PDF analysis."
                    ) from e

                if not isinstance(parsed, dict):
                    raise GeminiServiceError(
                        "Gemini returned an unexpected JSON structure "
                        "for scanned PDF analysis."
                    )

                return parsed

            except GeminiServiceError as e:
                last_error = e

                error_text = str(e).lower()

                if "invalid json" in error_text:
                    break

                if attempt < 3:
                    time.sleep(2 * attempt)
                    continue

                break

            except Exception as e:
                last_error = e

                if _is_retryable_error(e) and attempt < 3:
                    time.sleep(2 * attempt)
                    continue

                break

    raise GeminiServiceError(
        "Gemini scanned PDF analysis failed. "
        f"Models tried: {', '.join(models_to_try)}. "
        f"Last error: {type(last_error).__name__}: {last_error}"
    )


# ============================================================
# CHAT / ASK HEALTHMATE
# ============================================================

CHAT_SYSTEM_PROMPT = """
You are HealthMate AI, a helpful health-report assistant.

Your job is to answer questions about the user's uploaded health report.

IMPORTANT RULES:

1. Use only the information provided in REPORT CONTEXT.
2. Do not invent medical values.
3. If the requested information is not present in the report,
   clearly say that it is not available in the report.
4. Explain medical information in simple language.
5. Do not provide a diagnosis.
6. Do not claim certainty about a medical condition.
7. For abnormal values, briefly explain what the value generally means,
   while recommending consultation with a qualified healthcare professional
   when appropriate.
8. Keep answers clear and reasonably concise.
"""


def _generate_chat_response(
    client,
    model_name,
    prompt,
):
    """
    Send one chat request to Gemini.
    """

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=CHAT_SYSTEM_PROMPT,
            max_output_tokens=1024,
        ),
    )

    text = getattr(response, "text", None)

    if not text:
        raise GeminiServiceError(
            f"Gemini returned an empty chat response "
            f"(model={model_name})."
        )

    return text.strip()


def ask_about_report(report_context, question):
    """
    Ask Gemini a question about a previously analyzed report.
    """

    if not question or not question.strip():
        raise GeminiServiceError(
            "Please provide a question."
        )

    client = _get_client()

    prompt = f"""
REPORT CONTEXT:
{json.dumps(report_context, indent=2, default=str)}

USER QUESTION:
{question.strip()}

Answer the user's question using only the report context above.
"""

    primary_model = os.environ.get(
        "GEMINI_CHAT_MODEL"
    ) or os.environ.get(
        "GEMINI_MODEL"
    ) or "gemini-3.5-flash-lite"

    fallback_model = "gemini-3.8-flash"

    models_to_try = [primary_model]

    if fallback_model not in models_to_try:
        models_to_try.append(fallback_model)

    last_error = None

    for model_name in models_to_try:

        for attempt in range(1, 4):

            try:
                return _generate_chat_response(
                    client,
                    model_name,
                    prompt,
                )

            except Exception as e:
                last_error = e

                if _is_retryable_error(e) and attempt < 3:
                    time.sleep(2 * attempt)
                    continue

                break

    raise GeminiServiceError(
        "Gemini chat failed. "
        f"Models tried: {', '.join(models_to_try)}. "
        f"Last error: {type(last_error).__name__}: {last_error}"
    )