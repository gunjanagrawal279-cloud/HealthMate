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


def analyze_document_text(extracted_text):
    """
    Analyze uploaded medical document using Gemini.
    """

    client = _get_client()

    model_name = os.environ.get(
        "GEMINI_MODEL",
        "gemini-3.8-flash"
    )

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=build_user_prompt(extracted_text),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        text = getattr(response, "text", None)

        if not text:
            raise GeminiServiceError(
                "Gemini returned an empty response."
            )

        return text

    except Exception as e:
        raise GeminiServiceError(
            f"Gemini document analysis failed "
            f"(model={model_name}): {type(e).__name__}: {e}"
        ) from e


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

    # Primary model
    primary_model = os.environ.get(
        "GEMINI_CHAT_MODEL"
    ) or os.environ.get(
        "GEMINI_MODEL"
    ) or "gemini-3.8-flash"

    # Fallback model
    fallback_model = "gemini-3.8-flash"

    models_to_try = [primary_model]

    if fallback_model not in models_to_try:
        models_to_try.append(fallback_model)

    last_error = None

    for model_name in models_to_try:

        # Retry the same model 3 times
        for attempt in range(1, 4):

            try:
                return _generate_chat_response(
                    client,
                    model_name,
                    prompt,
                )

            except Exception as e:
                last_error = e

                if attempt < 3:
                    time.sleep(2 * attempt)

    raise GeminiServiceError(
        "Gemini chat failed. "
        f"Models tried: {', '.join(models_to_try)}. "
        f"Last error: {type(last_error).__name__}: {last_error}"
    )