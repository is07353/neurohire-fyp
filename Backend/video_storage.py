"""
Helpers for storing video interview files locally for analysis.

When a video is uploaded to UploadThing, we:
- get the public URL
- download the file on the backend
- save it under Backend/videos_application with a stable name based on
  application_id and question_index.
"""

from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent
VIDEO_DIR = BASE_DIR / "videos_application"


def ensure_video_dir() -> None:
    """Create the videos_application directory if it does not exist."""
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)


def download_and_save_video(video_url: str, application_id: int, question_index: int) -> Path:
    """
    Download the video file from UploadThing and save it to Backend/videos_application.

    We infer the extension from the Content-Type header and ensure the directory exists.
    """
    ensure_video_dir()

    resp = requests.get(video_url)
    resp.raise_for_status()

    content_type = resp.headers.get("Content-Type", "")
    print(
        "[video_storage] Downloading video",
        {"application_id": application_id, "question_index": question_index, "content_type": content_type},
    )

    if content_type.startswith("video/"):
        # e.g. video/webm, video/mp4
        ext = ".webm" if "webm" in content_type else ".mp4"
    else:
        ext = ".bin"

    target = VIDEO_DIR / f"app{application_id}_q{question_index}{ext}"
    target.write_bytes(resp.content)

    print(f"[video_storage] Saved video file to {target}")
    return target

