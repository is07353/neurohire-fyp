"""
Helpers for storing CV files locally for OCR.

When a CV is uploaded to UploadThing, we:
- get the public URL
- download the file on the backend
- save it under Backend/cv_pdfs with a stable name based on application_id.
"""

from pathlib import Path

import requests


BASE_DIR = Path(__file__).resolve().parent
CV_DIR = BASE_DIR / "cv_pdfs"


def ensure_cv_dir() -> None:
    """Create the cv_pdfs directory if it does not exist."""
    CV_DIR.mkdir(parents=True, exist_ok=True)


def download_and_save_cv(cv_url: str, application_id: int) -> Path:
    """
    Download the CV file from UploadThing and save it to Backend/cv_pdfs.

    We infer the extension from the Content-Type header and ensure the directory exists.
    """
    ensure_cv_dir()

    resp = requests.get(cv_url)
    resp.raise_for_status()

    content_type = resp.headers.get("Content-Type", "")
    print(f"[cv_storage] Downloading CV for application_id={application_id}, Content-Type={content_type}")

    # Default to .pdf (your CVs are PDFs), but fall back for safety.
    if content_type.startswith("application/pdf"):
        ext = ".pdf"
    elif content_type.startswith("image/jpeg"):
        ext = ".jpg"
    elif content_type.startswith("image/png"):
        ext = ".png"
    else:
        ext = ".bin"

    target = CV_DIR / f"cv_{application_id}{ext}"
    target.write_bytes(resp.content)

    print(f"[cv_storage] Saved CV file to {target}")
    return target

