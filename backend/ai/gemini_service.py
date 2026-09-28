import os
import json

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


def _get_models(env_name, default_model):
    """
    Primary model comes from Render environment variable.
    Current fallback is Gemini 3.5 Flash-Lite.
    """
    primary = os.environ.get(env_name) or default_model

    models = [primary]

    fallback = "gemini-3.5-flash-lite"

    if fallback not in models:
        models.append(fallback)

    return models


def _get_error_code(error):
    code = getattr(error, "code", None)

    if code is not None:
        try:
            return int(code)
        except (TypeError, ValueError):
            pass

    text = str(error)

    for marker in ("503", "502", "500", "504", "429", "408"):
        if marker in text:
            return int(marker)

    return None


def _clean_json(text):
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
        result = json.loads(cleaned)

    except json.JSONDecodeError as error:
        raise GeminiServiceError(
            "Gemini returned invalid JSON for document analysis."
        ) from error

    if not isinstance(result, dict):
        raise GeminiServiceError(
            "Gemini returned an unexpected response format."
        )

    return result


def _generate_text_analysis(
    client,
    model_name,
    extracted_text
):
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

    return _clean_json(
        getattr(response, "text", None)
    )


def analyze_document_text(extracted_text):
    """
    Analyze a normal text-based PDF.

    We try the configured model first and then
    Gemini 3.5 Flash-Lite as a fallback.

    No manual retry loop is used here because the
    Gemini Python SDK already has retry behavior for
    transient errors.
    """

    client = _get_client()

    models = _get_models(
        "GEMINI_MODEL",
        "gemini-3.8-flash"
    )

    last_error = None

    for model_name in models:

        try:
            print(
                f"Starting Gemini document analysis "
                f"with model={model_name}"
            )

            return _generate_text_analysis(
                client,
                model_name,
                extracted_text
            )

        except GeminiServiceError:
            raise

        except Exception as error:

            last_error = error

            print(
                f"Gemini document analysis error | "
                f"model={model_name} | "
                f"code={_get_error_code(error)} | "
                f"error={error}"
            )

            continue

    raise GeminiServiceError(
        "Gemini document analysis is temporarily unavailable. "
        f"Models tried: {', '.join(models)}. "
        f"Last error: "
        f"{type(last_error).__name__}: {last_error}"
    )


# ============================================================
# DIRECT PDF ANALYSIS
# ============================================================

def _generate_pdf_analysis(
    client,
    model_name,
    pdf_path
):
    uploaded_file = client.files.upload(
        file=pdf_path,
        config=types.UploadFileConfig(
            mime_type="application/pdf"
        ),
    )

    prompt = f"""
Analyze the attached health-report PDF.

IMPORTANT:
- Inspect all pages.
- The PDF may contain scanned/image-based pages.
- Extract only information visible in the report.
- Do not invent test values.
- Do not invent reference ranges.
- Do not diagnose diseases.
- Do not prescribe medication.
- Return ONLY the JSON structure required by the system prompt.

SYSTEM RULES:

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

    return _clean_json(
        getattr(response, "text", None)
    )


def analyze_document_pdf(pdf_path):
    """
    Direct PDF analysis.
    Mainly used for scanned/image-based PDFs.
    """

    client = _get_client()

    models = _get_models(
        "GEMINI_MODEL",
        "gemini-3.8-flash"
    )

    last_error = None

    for model_name in models:

        try:

            print(
                f"Starting Gemini PDF analysis "
                f"with model={model_name}"
            )

            return _generate_pdf_analysis(
                client,
                model_name,
                pdf_path
            )

        except GeminiServiceError:
            raise

        except Exception as error:

            last_error = error

            print(
                f"Gemini PDF analysis error | "
                f"model={model_name} | "
                f"code={_get_error_code(error)} | "
                f"error={error}"
            )

            continue

    raise GeminiServiceError(
        "Gemini PDF analysis is temporarily unavailable. "
        f"Models tried: {', '.join(models)}. "
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
   say that it is not available in the report.
4. Explain medical information in simple language.
5. Do not provide a diagnosis.
6. Do not claim certainty about a medical condition.
7. For abnormal values, explain them neutrally and recommend
   consulting a qualified healthcare professional when appropriate.
8. Keep answers clear and reasonably concise.
"""


def _generate_chat_response(
    client,
    model_name,
    prompt
):
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
            "Gemini returned an empty chat response."
        )

    return text.strip()


def ask_about_report(
    report_context,
    question
):
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

Answer using only the report context above.
"""

    models = _get_models(
        "GEMINI_CHAT_MODEL",
        "gemini-3.8-flash"
    )

    last_error = None

    for model_name in models:

        try:

            return _generate_chat_response(
                client,
                model_name,
                prompt
            )

        except Exception as error:

            last_error = error

            print(
                f"Gemini chat error | "
                f"model={model_name} | "
                f"code={_get_error_code(error)} | "
                f"error={error}"
            )

            continue

    raise GeminiServiceError(
        "Gemini chat is temporarily unavailable. "
        f"Models tried: {', '.join(models)}. "
        f"Last error: "
        f"{type(last_error).__name__}: {last_error}"
    )