"""
Utility script to:
- read a CV URL from cv_data by application_id
- download the PDF from UploadThing
- save it locally so a Python OCR model can consume it.

Usage (from Backend/):

    python cv_download_test.py 15

This will save ./cv_15.pdf next to this script.
"""

import asyncio
import sys
from pathlib import Path

import requests

from database import create_pool


async def get_cv_url_for_application(application_id: int) -> str | None:
    """Fetch cv_url from cv_data for a given application_id."""
    pool = await create_pool()
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT cv_url FROM cv_data WHERE application_id = $1;",
                application_id,
            )
    finally:
        await pool.close()

    if not row or not row["cv_url"]:
        return None

    return row["cv_url"]


def download_pdf(cv_url: str, application_id: int) -> Path:
    """Download the CV PDF from UploadThing and save it as a local file."""
    resp = requests.get(cv_url)
    resp.raise_for_status()

    target = Path(f"cv_{application_id}.pdf").resolve()
    target.write_bytes(resp.content)
    return target


async def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python cv_download_test.py <application_id>")
        raise SystemExit(1)

    try:
        application_id = int(sys.argv[1])
    except ValueError:
        print("application_id must be an integer")
        raise SystemExit(1)

    print(f"[cv_download_test] Looking up cv_data for application_id={application_id}...")
    cv_url = await get_cv_url_for_application(application_id)
    if not cv_url:
        print(f"[cv_download_test] No cv_data.cv_url found for application_id={application_id}")
        raise SystemExit(1)

    print(f"[cv_download_test] Found cv_url: {cv_url}")
    pdf_path = download_pdf(cv_url, application_id)
    print(f"[cv_download_test] Saved PDF to: {pdf_path}")
    print("[cv_download_test] You can now pass this path to your OCR.")


if __name__ == "__main__":
    asyncio.run(main())

