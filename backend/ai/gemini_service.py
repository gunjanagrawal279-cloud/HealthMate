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


def _get_model_chain(primary_env_name, default_primary, defaults=None):
    """
    Creates a unique list of Gemini models.
    The first model comes from the environment variable.
    The remaining models are used as fallbacks.
    """
    models = []

    primary = os.environ.get(primary_env_name) or default_primary

    if primary:
        models.append(primary)

    for model in (defaults or []):
        if model and model not in models:
            models.append(model)

    return models


def _error_code(error):
    """
    Best-effort extraction of HTTP/API error code
    from Gemini SDK exceptions.
    """
    code = getattr(error, "code", None)

    if code is not None:
        try:
            return int(code)
        except (TypeError, ValueError):
            pass

    text = str(error)

    for marker in ("503", "429", "500", "408", "504"):
        if marker in text:
            return int(marker)

    return None


def _is_retryable(error):
    """
    These errors are generally temporary:
    500, 503, 504, 408

    429 is NOT repeatedly retried here because it can
    represent a quota limit. In that case we move to
    the next configured fallback model.
    """
    code = _error_code(error)

    return code in {
        500,
        503,
        504,
        408,
    }


def _clean_json_response(text):
    """
    Cleans Gemini markdown fences if present
    and converts the response to a Python dictionary.
    """
    if not text:
        raise GeminiServiceError(
            "Gemini returned an empty response."
        )

    cleaned = text.strip()

    if cleaned.startswith("```json") and cleaned.endswith("```"):
        cleaned = cleaned[7:-3].strip()

    elif cleaned.startswith("```") and cleaned.endswith("```"):
        cleaned = cleaned[3:-3].strip()

    try:
        parsed = json.loads(cleaned)

    except json.JSONDecodeError as error:
        raise GeminiServiceError(
            "Gemini returned invalid JSON for document analysis."
        ) from error

    if not isinstance(parsed, dict):
        raise GeminiServiceError(
            "Gemini document analysis returned an unexpected JSON shape."
        )

    return parsed


def _generate_text_analysis(
    client,
    model_name,
    extracted_text
):
    """
    Sends extracted PDF text to Gemini.
    """
    response = client.models.generate_content(
        model=model_name,
        contents=build_user_prompt(extracted_text),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            temperature=0.2,
            max_output_tokens=4096,
        ),
    )

    text = getattr(response, "text", None)

    if not text:
        raise GeminiServiceError(
            f"Gemini returned an empty response "
            f"(model={model_name})."
        )

    return _clean_json_response(text)


def analyze_document_text(extracted_text):
    """
    Analyze a normal text-based health report.

    Model order:
    1. GEMINI_MODEL / gemini-3.8-flash
    2. gemini-3.5-flash-lite
    3. gemini-3.1-flash-lite

    Temporary 5xx errors get retry with backoff.
    Quota errors move directly to the next model.
    """

    client = _get_client()

    models_to_try = _get_model_chain(
        "GEMINI_MODEL",
        "gemini-3.8-flash",
        [
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
        ],
    )

    if not models_to_try:
        raise GeminiServiceError(
            "No Gemini model is configured."
        )

    last_error = None

    for model_name in models_to_try:

        for attempt in range(1, 4):

            try:
                return _generate_text_analysis(
                    client,
                    model_name,
                    extracted_text,
                )

            except GeminiServiceError:
                raise

            except Exception as error:

                last_error = error

                error_code = _error_code(error)

                print(
                    f"Gemini text analysis error | "
                    f"model={model_name} | "
                    f"attempt={attempt} | "
                    f"code={error_code} | "
                    f"error={error}"
                )

                # 429/quota:
                # Don't waste retries.
                # Move directly to fallback model.
                if error_code == 429:
                    break

                # Other non-temporary errors:
                # move to the next model.
                if not _is_retryable(error):
                    break

                # Retry temporary 5xx/408 errors.
                if attempt < 3:
                    delay = 2 ** (attempt - 1)

                    print(
                        f"Temporary Gemini error. "
                        f"Retrying in {delay} seconds..."
                    )

                    time.sleep(delay)

    raise GeminiServiceError(
        "Gemini document analysis failed. "
        f"Models tried: {', '.join(models_to_try)}. "
        f"Last error: "
        f"{type(last_error).__name__}: {last_error}"
    )


def _generate_pdf_analysis(
    client,
    model_name,
    pdf_path
):
    """
    Sends the complete PDF directly to Gemini.

    This is especially useful for scanned/image-based PDFs
    where PyMuPDF cannot extract readable text.
    """

    uploaded_file = client.files.upload(
        file=pdf_path,
        config=types.UploadFileConfig(
            mime_type="application/pdf"
        ),
    )

    prompt = f"""
Analyze the attached health-report PDF for the HealthMate application.

IMPORTANT:
- Inspect every page of the PDF.
- The PDF may be scanned or image-based.
- Read visible text, tables, numbers, units and reference ranges.
- Do not invent any test value.
- Do not invent a reference range.
- Do not diagnose a disease.
- Do not prescribe medication.
- Return ONLY the JSON object required by the HealthMate system prompt.

Use the following system rules:

{SYSTEM_PROMPT}
"""

    response = client.models.generate_content(
        model=model_name,
        contents=[
            prompt,
            uploaded_file,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
            max_output_tokens=4096,
        ),
    )

    text = getattr(response, "text", None)

    if not text:
        raise GeminiServiceError(
            f"Gemini returned an empty PDF response "
            f"(model={model_name})."
        )

    return _clean_json_response(text)


def analyze_document_pdf(pdf_path):
    """
    Analyze a PDF directly with Gemini.

    Used mainly when a PDF is scanned/image-based
    and normal text extraction fails.

    Temporary 503/5xx errors are retried.
    429 quota errors move to the next model.
    """

    client = _get_client()

    models_to_try = _get_model_chain(
        "GEMINI_MODEL",
        "gemini-3.8-flash",
        [
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
        ],
    )

    if not models_to_try:
        raise GeminiServiceError(
            "No Gemini model is configured."
        )

    last_error = None

    for model_name in models_to_try:

        for attempt in range(1, 4):

            try:
                return _generate_pdf_analysis(
                    client,
                    model_name,
                    pdf_path,
                )

            except GeminiServiceError:
                raise

            except Exception as error:

                last_error = error

                error_code = _error_code(error)

                print(
                    f"Gemini PDF analysis error | "
                    f"model={model_name} | "
                    f"attempt={attempt} | "
                    f"code={error_code} | "
                    f"error={error}"
                )

                # Quota error:
                # immediately try fallback model.
                if error_code == 429:
                    break

                # Other permanent/non-temporary errors.
                if not _is_retryable(error):
                    break

                # Temporary 503 etc.
                if attempt < 3:
                    delay = 2 ** (attempt - 1)

                    print(
                        f"Temporary Gemini PDF error. "
                        f"Retrying in {delay} seconds..."
                    )

                    time.sleep(delay)

    raise GeminiServiceError(
        "Gemini PDF document analysis failed. "
        f"Models tried: {', '.join(models_to_try)}. "
        f"Last error: "
        f"{type(last_error).__name__}: {last_error}"
    )


# ============================================================
# HEALTHMATE AI CHAT
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
    prompt
):
    """
    Generate a HealthMate AI chat response.
    """

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=CHAT_SYSTEM_PROMPT,
            temperature=0.2,
            max_output_tokens=512,
        ),
    )

    text = getattr(response, "text", None)

    if not text:
        raise GeminiServiceError(
            f"Gemini returned an empty response "
            f"(model={model_name})."
        )

    return text.strip()


def ask_about_report(
    report_context,
    question
):
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

{json.dumps(
    report_context,
    indent=2,
    default=str
)}

USER QUESTION:

{question.strip()}

Answer the user's question using only the report context above.
"""

    models_to_try = _get_model_chain(
        "GEMINI_CHAT_MODEL",
        os.environ.get(
            "GEMINI_MODEL",
            "gemini-3.8-flash"
        ),
        [
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
        ],
    )

    if not models_to_try:
        raise GeminiServiceError(
            "No Gemini chat model is configured."
        )

    last_error = None

    for model_name in models_to_try:

        for attempt in range(1, 4):

            try:
                return _generate_chat_response(
                    client,
                    model_name,
                    prompt,
                )

            except Exception as error:

                last_error = error

                error_code = _error_code(error)

                print(
                    f"Gemini chat error | "
                    f"model={model_name} | "
                    f"attempt={attempt} | "
                    f"code={error_code} | "
                    f"error={error}"
                )

                # Quota:
                # immediately move to fallback model.
                if error_code == 429:
                    break

                # Permanent error:
                # move to next model.
                if not _is_retryable(error):
                    break

                # Temporary error:
                # retry with exponential backoff.
                if attempt < 3:
                    delay = 2 ** (attempt - 1)

                    print(
                        f"Temporary Gemini chat error. "
                        f"Retrying in {delay} seconds..."
                    )

                    time.sleep(delay)

    raise GeminiServiceError(
        "Gemini chat failed. "
        f"Models tried: {', '.join(models_to_try)}. "
        f"Last error: "
        f"{type(last_error).__name__}: {last_error}"
    )