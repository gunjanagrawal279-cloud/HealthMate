ALLOWED_STATUSES = {"NORMAL", "LOW", "HIGH", "UNKNOWN"}


def _clean_string(value):
    """
    Convert a value into a safe string.
    None becomes an empty string.
    """
    if value is None:
        return ""

    if isinstance(value, str):
        return value.strip()

    return str(value).strip()


def _clean_string_list(value):
    """
    Ensure a field is always a list of strings.
    Invalid/non-list values become an empty list.
    """
    if not isinstance(value, list):
        return []

    cleaned = []

    for item in value:
        text = _clean_string(item)

        if text:
            cleaned.append(text)

    return cleaned


def _normalize_test_result(item):
    """
    Validate and normalize one extracted test result.
    """

    if not isinstance(item, dict):
        return None

    test_name = _clean_string(item.get("test_name"))

    if not test_name:
        test_name = "Unknown Test"

    value = _clean_string(item.get("value"))
    unit = _clean_string(item.get("unit"))
    reference_range = _clean_string(item.get("reference_range"))
    explanation = _clean_string(item.get("explanation"))

    status = _clean_string(item.get("status")).upper()

    if status not in ALLOWED_STATUSES:
        status = "UNKNOWN"

    # If no reference range exists, we should not claim
    # that the value is normal/low/high.
    if not reference_range:
        status = "UNKNOWN"

    return {
        "test_name": test_name,
        "value": value,
        "unit": unit,
        "reference_range": reference_range,
        "status": status,
        "explanation": explanation,
    }


def validate_ai_result(data):
    """
    Validate and normalize Gemini's structured response.

    Returns a safe dictionary matching the application's
    expected AI response structure.

    Raises ValueError when the top-level response is unusable.
    """

    if not isinstance(data, dict):
        raise ValueError("Gemini response must be a JSON object.")

    document_summary = _clean_string(
        data.get("document_summary")
    )

    key_observations = _clean_string_list(
        data.get("key_observations", [])
    )

    abnormal_values = _clean_string_list(
        data.get("abnormal_values", [])
    )

    simple_explanations = _clean_string_list(
        data.get("simple_explanations", [])
    )

    doctor_questions = _clean_string_list(
        data.get("doctor_questions", [])
    )

    disclaimer = _clean_string(
        data.get("disclaimer")
    )

    raw_test_results = data.get("test_results", [])

    if not isinstance(raw_test_results, list):
        raw_test_results = []

    test_results = []

    for item in raw_test_results:
        normalized = _normalize_test_result(item)

        if normalized is not None:
            test_results.append(normalized)

    # Always provide the required medical safety disclaimer.
    if not disclaimer:
        disclaimer = (
            "This platform provides educational information and is "
            "not a substitute for professional medical advice."
        )

    # If there are no structured test results, make that explicit.
    if not test_results and not document_summary:
        document_summary = (
            "No structured test results could be reliably identified "
            "from the supplied document."
        )

    return {
        "document_summary": document_summary,
        "key_observations": key_observations,
        "test_results": test_results,
        "abnormal_values": abnormal_values,
        "simple_explanations": simple_explanations,
        "doctor_questions": doctor_questions,
        "disclaimer": disclaimer,
    }