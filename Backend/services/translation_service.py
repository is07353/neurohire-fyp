"""
Translation service using OpenAI API for English to Urdu translation.

Translates job-related content (titles, descriptions, questions) from English to Urdu.
Uses gpt-4o-mini model with temperature=0 for deterministic translations.
"""

import os
from typing import Optional

from openai import OpenAI

# Load API key from environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError(
        "OPENAI_API_KEY environment variable is required. "
        "Please set it in your .env file or environment."
    )

# Initialize OpenAI client
_client = OpenAI(api_key=OPENAI_API_KEY)

# Model configuration
MODEL = "gpt-4o-mini"
TEMPERATURE = 0  # Deterministic translations


def translate_to_urdu(text: str) -> Optional[str]:
    """
    Translate English text to Urdu using OpenAI API.
    
    Args:
        text: English text to translate
        
    Returns:
        Urdu translation, or None if translation fails
        
    Raises:
        Exception: If API call fails or API key is invalid
    """
    if not text or not text.strip():
        return None
    
    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional translator. Translate the following English text to Urdu. "
                               "Provide only the Urdu translation, no explanations or additional text. "
                               "Use natural, professional Urdu that is appropriate for job postings and professional contexts."
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            temperature=TEMPERATURE,
        )
        
        translation = response.choices[0].message.content.strip()
        return translation if translation else None
        
    except Exception as e:
        print(f"[translation_service] Error translating text: {e}")
        raise


def translate_job_title(title: str) -> Optional[str]:
    """Translate job title from English to Urdu."""
    return translate_to_urdu(title)


def translate_job_description(description: str) -> Optional[str]:
    """Translate job description from English to Urdu."""
    return translate_to_urdu(description)


def translate_question(question: str) -> Optional[str]:
    """Translate job question from English to Urdu."""
    return translate_to_urdu(question)


def translate_company_name(name: str) -> Optional[str]:
    """Translate company name from English to Urdu."""
    return translate_to_urdu(name)


def translate_branch_name(name: str) -> Optional[str]:
    """Translate branch name from English to Urdu."""
    return translate_to_urdu(name)


def translate_location(location: str) -> Optional[str]:
    """Translate location from English to Urdu."""
    return translate_to_urdu(location)


def translate_other_requirements(text: str) -> Optional[str]:
    """Translate other requirements text from English to Urdu."""
    return translate_to_urdu(text)


def translate_skills(skills: list[str]) -> list[Optional[str]]:
    """
    Translate a list of skill names from English to Urdu.
    Uses a single API call with newline-separated list for efficiency.
    Returns list of Urdu strings (or None for empty/failed).
    """
    if not skills:
        return []
    cleaned = [s.strip() for s in skills if s and s.strip()]
    if not cleaned:
        return []
    try:
        # One call: "Translate each line to Urdu. One translation per line, same order."
        combined = "\n".join(cleaned)
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional translator. Translate the following English lines to Urdu. "
                               "Output exactly one Urdu translation per line, in the same order. "
                               "Use natural Urdu. No numbering or extra text, only the translations separated by newlines."
                },
                {"role": "user", "content": combined},
            ],
            temperature=TEMPERATURE,
        )
        content = response.choices[0].message.content.strip()
        if not content:
            return [None] * len(cleaned)
        lines = [line.strip() for line in content.split("\n") if line.strip()]
        # Pad or trim to match input length
        while len(lines) < len(cleaned):
            lines.append(None)
        return lines[:len(cleaned)]
    except Exception as e:
        print(f"[translation_service] Error translating skills: {e}")
        return [None] * len(cleaned)


def translate_work_mode(work_mode: str) -> Optional[str]:
    """Translate work mode (ONSITE/REMOTE) to Urdu."""
    if not work_mode or not work_mode.strip():
        return None
    # Normalize for prompt
    text = "Onsite" if work_mode.strip().upper() == "ONSITE" else "Remote"
    return translate_to_urdu(text)


def translate_minimum_experience_display(years: int) -> Optional[str]:
    """Translate 'X years' experience to Urdu display string (e.g. '۰ سال', '۲ سال')."""
    try:
        text = f"{years} years" if years != 1 else "1 year"
        return translate_to_urdu(text)
    except Exception:
        return None


def translate_salary_display(amount_pkr: int) -> Optional[str]:
    """Translate salary to Urdu display string (e.g. '33,000 روپے ماہانہ')."""
    if amount_pkr <= 0:
        return None
    try:
        # Ask for "X PKR per month" in Urdu (we pass the number, model formats)
        text = f"{amount_pkr} PKR per month"
        return translate_to_urdu(text)
    except Exception:
        return None
