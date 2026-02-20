"""
Client for the Gradio-hosted CV + Job Description analysis API.

Calls /process_cv with the applicant's CV file and job description;
returns normalized extraction + analysis. Retries (up to 4 attempts) when
the model raw output contains "Model output could not be parsed as JSON"
or "JSON parse failed". Uses a long timeout and retries on connection
disconnect so the remote model server has time to respond.
"""

import json
import re
import time
from pathlib import Path
from typing import Any

# Gradio client: pip install gradio_client
from gradio_client import Client, handle_file

# Default Gradio app URL (can be overridden via env)
GRADIO_APP_URL = "https://334096f8f44116bb4e.gradio.live/"
API_NAME = "/process_cv"
MAX_RETRIES = 4
# Timeout in seconds for Gradio HTTP calls (model inference can be slow)
GRADIO_TIMEOUT = 300
# Delay between retries on connection disconnect/timeout
CONNECT_RETRY_DELAY_SEC = 5
# Phrases in model raw output that trigger a retry (call API again instead of proceeding)
PARSE_ERROR_STRINGS = (
    "Model output could not be parsed as JSON",
    "JSON parse failed",
)


def _is_connection_error(exc: BaseException) -> bool:
    """True if the exception looks like a disconnect/timeout/connection failure."""
    msg = (getattr(exc, "message", None) or str(exc)).lower()
    errname = type(exc).__name__.lower()
    return (
        "disconnect" in msg or "connection" in msg or "timeout" in msg
        or "reset" in msg or "closed" in msg or "refused" in msg
        or "readtimeout" in errname or "connecttimeout" in errname
        or "connectionerror" in errname or "remoteerror" in errname
    )


def _should_retry(result: Any) -> bool:
    """True if the model raw output indicates a parse failure; we retry instead of proceeding."""
    result_str = str(result)
    return any(phrase in result_str for phrase in PARSE_ERROR_STRINGS)


def _normalize_result(raw: Any) -> dict[str, Any]:
    """
    Normalize API response into a consistent dict. Handles:
    - result as tuple (Gradio may return tuple of outputs)
    - result as str (try JSON parse; strip markdown code blocks)
    - result as dict
    - LLM variability: email vs email_address, home_address vs address
    """
    if isinstance(raw, dict):
        data = raw
    elif isinstance(raw, (list, tuple)):
        # Use first element that looks like the analysis (dict or json string)
        for item in raw:
            if isinstance(item, dict):
                data = item
                break
            if isinstance(item, str) and (item.strip().startswith("{") or "Total_score" in item):
                data = _parse_json_str(item)
                break
        else:
            data = {}
    elif isinstance(raw, str):
        data = _parse_json_str(raw)
    else:
        data = {}

    # Normalize keys (LLM sometimes returns email vs email_address, etc.)
    out: dict[str, Any] = {}
    for k, v in data.items():
        if v is None:
            continue
        k_lower = k.lower().replace(" ", "_")
        if k_lower in ("email", "email_address"):
            out["email"] = _str(v)
        elif k_lower in ("home_address", "address"):
            out["address"] = _str(v)
        elif k_lower == "name":
            out["name"] = _str(v)
        elif k_lower == "phone_number" or k_lower == "phone":
            out["phone_number"] = _str(v)
        elif k_lower == "matching_analysis":
            out["matching_analysis"] = v if isinstance(v, list) else ([v] if v else [])
        elif k_lower == "description":
            out["description"] = _str(v)
        elif k_lower in ("total_score", "score"):
            out["Total_score"] = _int_or_none(v)
        elif k_lower == "recommendation":
            out["recommendation"] = _str(v)
        else:
            out[k] = v

    # Ensure common keys exist
    out.setdefault("name", "")
    out.setdefault("email", "")
    out.setdefault("phone_number", "")
    out.setdefault("address", "")
    out.setdefault("description", "")
    out.setdefault("matching_analysis", [])
    out.setdefault("Total_score", None)
    out.setdefault("recommendation", "")
    return out


def _str(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def _int_or_none(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _parse_json_str(s: str) -> dict[str, Any]:
    s = s.strip()
    # Remove markdown code block if present
    if s.startswith("```"):
        s = re.sub(r"^```\w*\n?", "", s)
        s = re.sub(r"\n?```\s*$", "", s)
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        # Try to extract a dict from the string (e.g. single-quoted Python repr)
        try:
            # Replace single quotes with double for JSON (naive; may break on embedded quotes)
            normalized = s.replace("'", '"')
            return json.loads(normalized)
        except json.JSONDecodeError:
            return {}


def run_cv_jd_analysis(
    cv_path: Path,
    job_description: str,
    *,
    api_url: str = GRADIO_APP_URL,
    max_retries: int = MAX_RETRIES,
) -> dict[str, Any]:
    """
    Call the Gradio CV+JD analysis API with the given CV file and job description.

    - cv_path: path to the CV file (PDF preferred).
    - job_description: full job description text.
    - If the model raw output contains "Model output could not be parsed as JSON" or "JSON parse failed",
      the request is retried up to max_retries times (default 4); only then do we proceed with the response.

    Returns a normalized dict with at least: name, email, phone_number, address,
    description, matching_analysis, Total_score, recommendation.
    """
    job_description = (job_description or "").strip() or " "
    if not cv_path.exists():
        return {
            "name": "",
            "email": "",
            "phone_number": "",
            "address": "",
            "description": "",
            "matching_analysis": [],
            "Total_score": None,
            "recommendation": "",
            "error": "CV file not found",
        }

    client = Client(api_url, httpx_kwargs={"timeout": GRADIO_TIMEOUT})
    last_result: Any = None
    last_error: Exception | None = None

    for attempt in range(max_retries):
        try:
            result = client.predict(
                cv_pdf=handle_file(str(cv_path)),
                job_description=job_description,
                api_name=API_NAME,
            )
            last_result = result
            print("[cv_analysis] Model raw output (attempt {}):".format(attempt + 1))
            print(result)

            if _should_retry(result):
                if attempt < max_retries - 1:
                    print("[cv_analysis] Parse error in model output. Retrying...")
                    continue
                print("[cv_analysis] Max retries reached, proceeding with last result.")
            return _normalize_result(result)
        except Exception as e:
            last_error = e
            if _is_connection_error(e):
                print("[cv_analysis] Connection error (attempt {}): {}; will retry.".format(attempt + 1, e))
            if attempt < max_retries - 1:
                time.sleep(CONNECT_RETRY_DELAY_SEC)
                continue
            return {
                "name": "",
                "email": "",
                "phone_number": "",
                "address": "",
                "description": "",
                "matching_analysis": [],
                "Total_score": None,
                "recommendation": "",
                "error": str(last_error),
            }

    # All retries exhausted due to parse-error message
    return _normalize_result(last_result) if last_result is not None else {
        "name": "",
        "email": "",
        "phone_number": "",
        "address": "",
        "description": "",
        "matching_analysis": [],
        "Total_score": None,
        "recommendation": "",
        "error": "Could not parse analysis after retries",
    }
