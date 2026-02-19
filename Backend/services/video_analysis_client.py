"""
Client for the FastAPI + Cloudflare video analysis API.

Given a local video file, job role/title and interview question text, this
module POSTs to /analyze (multipart: video, role, question) and normalizes
the JSON output so the rest of the backend can persist it to the database.
Uses a long timeout and retries on connection disconnect.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any, Dict

import requests

# FastAPI + Cloudflare tunnel (override with env or pass api_url if needed)
VIDEO_ANALYSIS_BASE_URL = "https://tiger-linear-factor-climate.trycloudflare.com"
VIDEO_ANALYSIS_ENDPOINT = "/analyze"
# Timeout in seconds (video pipeline is heavy; allow up to 10 min)
VIDEO_REQUEST_TIMEOUT = 600
# Retries and delay on connection disconnect/timeout
VIDEO_MAX_RETRIES = 4
VIDEO_RETRY_DELAY_SEC = 8


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
    read expected keys. Handles the FastAPI response shape:
      - visual_analysis: { face_presence_ratio, camera_engagement_ratio, yaw_variance, visual_confidence_score, needs_review }
      - transcript (top-level)
      - grading: { scores: { relevance, clarity }, summary }
    """
    data: Dict[str, Any]

    if isinstance(raw, dict):
        data = raw
    elif isinstance(raw, (list, tuple)):
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

    # Flatten new API shape to top-level keys expected by extract_video_metrics and DB
    out: Dict[str, Any] = {}
    if "transcript" in data:
        out["transcript"] = data["transcript"]
    va = data.get("visual_analysis") or {}
    if isinstance(va, dict):
        out["face_presence_ratio"] = va.get("face_presence_ratio")
        out["camera_engagement_ratio"] = va.get("camera_engagement_ratio")
        out["yaw_variance"] = va.get("yaw_variance")
        out["visual_confidence_score"] = va.get("visual_confidence_score")
        out["needs_review"] = va.get("needs_review")
    gr = data.get("grading") or {}
    if isinstance(gr, dict):
        out["summary"] = gr.get("summary")
        scores = gr.get("scores") or {}
        if isinstance(scores, dict):
            out["relevance"] = scores.get("relevance")
            out["clarity"] = scores.get("clarity")
    # Keep raw keys we didn't flatten so _find_key_deep still has fallback
    for k, v in data.items():
        if k not in out and k not in ("visual_analysis", "grading"):
            out[k] = v
    return out


def _as_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _as_int_score(v: Any) -> int | None:
    """Convert to int; if value is in [0, 1] (e.g. 0.8), scale to 0-100 for DB."""
    if v is None:
        return None
    try:
        f = float(v)
        if 0 <= f <= 1:
            return int(round(f * 100))
        return int(round(f))
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
    api_url: str | None = None,
) -> Dict[str, Any]:
    """
    Call the FastAPI /analyze endpoint with the given local video file.

    POSTs multipart/form-data: video (file), role, question.
    Returns the raw (normalized) dict so the caller can persist it to
    ai_assessments.speech_llm_output and extract specific fields.
    """
    if not video_path.exists():
        print("[video_analysis] ERROR: Video file not found at", video_path)
        return {"error": f"Video file not found at {video_path}"}

    base = (api_url or VIDEO_ANALYSIS_BASE_URL).rstrip("/")
    url = f"{base}{VIDEO_ANALYSIS_ENDPOINT}"
    last_error: Exception | None = None

    print("[video_analysis] Starting pipeline -> URL:", url)
    print("[video_analysis] Video:", video_path, "| role:", role or "(empty)", "| question:", (question or "(empty)")[:60] + ("..." if len(question or "") > 60 else ""))

    for attempt in range(VIDEO_MAX_RETRIES):
        print("[video_analysis] Attempt {}/{} ...".format(attempt + 1, VIDEO_MAX_RETRIES))
        try:
            with open(video_path, "rb") as f:
                # Let server infer type; name is enough for multipart
                files = {"video": (video_path.name, f)}
                data = {"role": role or "", "question": question or ""}
                resp = requests.post(
                    url,
                    files=files,
                    data=data,
                    timeout=VIDEO_REQUEST_TIMEOUT,
                )
            print("[video_analysis] Response status:", resp.status_code)
            if not resp.ok:
                err_body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                err_msg = err_body.get("error", err_body.get("detail", resp.text or resp.reason))
                print("[video_analysis] HTTP error:", resp.status_code, "->", err_msg)
                return {"error": str(err_msg) if err_msg else f"HTTP {resp.status_code}"}
            result = resp.json()
            print("[video_analysis] Success. Raw pipeline output:", result)
            return _normalize_video_result(result)
        except requests.RequestException as e:
            last_error = e
            print("[video_analysis] Request failed (attempt {}): {}".format(attempt + 1, e))
            if _is_connection_error(e):
                print("[video_analysis] Treating as connection error; will retry.")
            if attempt < VIDEO_MAX_RETRIES - 1:
                print("[video_analysis] Waiting {}s before retry ...".format(VIDEO_RETRY_DELAY_SEC))
                time.sleep(VIDEO_RETRY_DELAY_SEC)
                continue
            print("[video_analysis] All retries exhausted.")
            return {"error": str(last_error)}
        except Exception as e:
            last_error = e
            print("[video_analysis] Unexpected error (attempt {}): {}".format(attempt + 1, e))
            if attempt < VIDEO_MAX_RETRIES - 1:
                print("[video_analysis] Waiting {}s before retry ...".format(VIDEO_RETRY_DELAY_SEC))
                time.sleep(VIDEO_RETRY_DELAY_SEC)
                continue
            print("[video_analysis] All retries exhausted.")
            return {"error": str(last_error)}
    print("[video_analysis] Failed after all retries.")
    return {"error": str(last_error) if last_error else "Video analysis failed after retries"}


def extract_video_metrics(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract strongly-typed fields for Postgres from the normalized payload.
    Handles both flat (after _normalize_video_result) and nested API shapes.
    """
    def gv(key: str) -> Any:
        if key in payload and payload.get(key) is not None:
            return payload.get(key)
        return _find_key_deep(payload, key)

    # visual_confidence_score: API may return 0.8 (float 0-1) or 80 (int 0-100)
    raw_confidence = (
        gv("visual_confidence_score")
        or gv("confidence_score")
        or gv("confidence")
    )
    # camera_engagement: API uses camera_engagement_ratio (lowercase)
    raw_engagement = gv("camera_engagement_ratio") or gv("camera_engagement_Ratio")

    return {
        "visual_confidence_score": _as_int_score(raw_confidence),
        "clarity": _as_int(gv("clarity")),
        "relevance": _as_int(gv("relevance")),
        "summary": (str(gv("summary") or "").strip() or None),
        "transcript": (str(gv("transcript") or "").strip() or None),
        "camera_engagement_Ratio": _as_float(raw_engagement),
        "yaw_variance": _as_float(gv("yaw_variance")),
        "face_presence_ratio": _as_float(gv("face_presence_ratio")),
        "needs_review": _as_bool(gv("needs_review")),
    }

