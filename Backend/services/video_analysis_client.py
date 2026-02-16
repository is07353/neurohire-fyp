"""
Client for the Gradio-hosted video + speech analysis pipeline.

Given a local video file, job role/title and interview question text, this
module calls the /full_pipeline endpoint and normalizes the JSON output so
the rest of the backend can safely persist it to the database.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict

from gradio_client import Client, handle_file

# Default Gradio app URL for the video pipeline (can be overridden later if needed)
GRADIO_VIDEO_APP_URL = "https://5a9de04ca102d11e37.gradio.live/"
VIDEO_API_NAME = "/full_pipeline"


def _parse_json_str(s: str) -> Dict[str, Any]:
    """Best-effort conversion of a string response into a JSON dict."""
    s = s.strip()
    # Strip markdown code fences if present
    if s.startswith("```"):
        s = re.sub(r"^```\w*\n?", "", s)
        s = re.sub(r"\n?```\s*$", "", s)
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        # Naive fallback: replace single quotes with double quotes
        try:
            normalized = s.replace("'", '"')
            return json.loads(normalized)
        except json.JSONDecodeError:
            return {}


def _normalize_video_result(raw: Any) -> Dict[str, Any]:
    """
    Normalize the video pipeline result into a flat dict so callers can safely
    read expected keys such as:
      - visual_confidence_score
      - clarity
      - relevance
      - summary
      - transcript
      - camera_engagement_Ratio
      - yaw_variance
      - needs_review
    """
    data: Dict[str, Any]

    if isinstance(raw, dict):
        data = raw
    elif isinstance(raw, (list, tuple)):
        # Use the first element that looks like a dict / JSON string.
        for item in raw:
            if isinstance(item, dict):
                data = item
                break
            if isinstance(item, str) and ("{" in item or "visual_confidence_score" in item):
                data = _parse_json_str(item)
                break
        else:
            data = {}
    elif isinstance(raw, str):
        data = _parse_json_str(raw)
    else:
        data = {}

    return data


def _as_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _as_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _as_bool(v: Any) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    s = str(v).strip().lower()
    if s in ("true", "1", "yes", "y"):
        return True
    if s in ("false", "0", "no", "n", ""):
        return False
    return False


def _find_key_deep(data: Any, target_key: str) -> Any:
    """
    Search a nested dict/list structure for the first value whose key matches
    target_key (case-insensitive, ignoring underscores).
    """
    normalized_target = target_key.replace("_", "").lower()

    if isinstance(data, dict):
        for k, v in data.items():
            nk = str(k).replace("_", "").lower()
            if nk == normalized_target:
                return v
            found = _find_key_deep(v, target_key)
            if found is not None:
                return found
    elif isinstance(data, (list, tuple)):
        for item in data:
            found = _find_key_deep(item, target_key)
            if found is not None:
                return found
    return None


def run_video_full_pipeline(
    video_path: Path,
    role: str,
    question: str,
    *,
    api_url: str = GRADIO_VIDEO_APP_URL,
) -> Dict[str, Any]:
    """
    Call the Gradio /full_pipeline endpoint with the given local video file.

    Returns the raw (normalized) dict produced by the model so that the caller
    can both persist the full JSON to ai_assessments.speech_llm_output and
    extract specific fields.
    """
    if not video_path.exists():
        return {"error": f"Video file not found at {video_path}"}

    client = Client(api_url)
    try:
        result = client.predict(
            video_file=handle_file(str(video_path)),
            role=role or "",
            question=question or "",
            api_name=VIDEO_API_NAME,
        )
        print("[video_analysis] Raw pipeline output:", result)
    except Exception as e:  # pragma: no cover - network / external service
        return {"error": str(e)}

    return _normalize_video_result(result)


def extract_video_metrics(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract strongly-typed fields that we need to persist in Postgres from the
    normalized payload.
    """
    # Allow values either at the top level or nested inside structures like
    # grading -> scores -> { ... } etc.
    def gv(key: str) -> Any:
        if key in payload and payload.get(key) is not None:
            return payload.get(key)
        return _find_key_deep(payload, key)

    # Confidence can show up under different keys; try a few fallbacks.
    raw_confidence = (
        gv("visual_confidence_score")
        or gv("confidence_score")
        or gv("confidence")
    )

    return {
        "visual_confidence_score": _as_int(raw_confidence),
        "clarity": _as_int(gv("clarity")),
        "relevance": _as_int(gv("relevance")),
        "summary": (str(gv("summary") or "").strip() or None),
        "transcript": (str(gv("transcript") or "").strip() or None),
        "camera_engagement_Ratio": _as_float(gv("camera_engagement_Ratio")),
        "yaw_variance": _as_float(gv("yaw_variance")),
        "face_presence_ratio": _as_float(gv("face_presence_ratio")),
        "needs_review": _as_bool(gv("needs_review")),
    }

