"""
TTS Service – Candidate flow only.
Models auto-download on first run (no pre-download assumed).

Run from tts_service directory (must use port 8001; frontend proxies /tts to this port):
  pip install -r requirements.txt
  python -m uvicorn tts_server:app --reload --port 8001

Do NOT run "main:app" here — that is the main backend (run from Backend/ on port 8000).
"""
from __future__ import annotations

import io
import logging
from contextlib import asynccontextmanager

import soundfile as sf
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Models loaded once at startup (not per request)
_english_tts = None
_urdu_tts = None


def _get_english_tts():
    global _english_tts
    if _english_tts is None:
        from transformers import pipeline
        _english_tts = pipeline(
            "text-to-speech",
            model="facebook/mms-tts-eng",
        )
    return _english_tts


def _get_urdu_tts():
    global _urdu_tts
    if _urdu_tts is None:
        from transformers import pipeline
        # Use script_arabic: UI uses Urdu in Perso-Arabic script (e.g. ملازمت); script_devanagari expects Devanagari.
        _urdu_tts = pipeline(
            "text-to-speech",
            model="facebook/mms-tts-urd-script_arabic",
        )
    return _urdu_tts


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load TTS models once at startup (auto-download on first run)."""
    # Preload so first request is fast; optional, can lazy-load in endpoint
    try:
        _get_english_tts()
    except Exception:
        pass
    try:
        _get_urdu_tts()
    except Exception:
        pass
    yield
    # no cleanup needed for pipeline objects


app = FastAPI(title="TTS Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class SpeakRequest(BaseModel):
    text: str = ""
    language: str = "eng"


ALLOWED_LANGUAGES = frozenset({"eng", "urd"})
LANGUAGE_ALIASES = {"en": "eng", "english": "eng", "ur": "urd", "urdu": "urd"}


class ValidationError(Exception):
    """Client-side validation error (return 400)."""


def _normalize_language(lang: str) -> str:
    if not lang:
        return "eng"
    key = (lang or "").strip().lower()
    return LANGUAGE_ALIASES.get(key, key)


def _generate_wav(text: str, language: str) -> bytes:
    import numpy as np

    text = (text or "").strip()
    if not text:
        raise ValidationError("text is required and must be non-empty")
    lang = _normalize_language(language)
    if lang not in ALLOWED_LANGUAGES:
        raise ValidationError(f"language must be one of eng, urd (got {language!r})")

    if lang == "eng":
        pipe = _get_english_tts()
    else:
        pipe = _get_urdu_tts()

    out = pipe(text)

    # Pipeline may return a single dict, a list of dicts, or a raw array (avoid "truth value of array" error)
    if isinstance(out, list) and len(out) > 0:
        out = out[0]
    if isinstance(out, dict):
        audio = out.get("audio")
        if audio is None:
            audio = out.get("waveform")
        sampling_rate = out.get("sampling_rate") or out.get("sample_rate") or getattr(
            getattr(pipe, "model", None) and getattr(pipe.model, "config", None) or None,
            "sampling_rate",
            None,
        ) or 16000
        if audio is None:
            raise RuntimeError(f"TTS pipeline did not return audio (keys: {list(out.keys())})")
    else:
        # Raw array from pipeline
        audio = out
        sampling_rate = getattr(
            getattr(pipe, "model", None) and getattr(pipe.model, "config", None) or None,
            "sampling_rate",
            16000,
        ) or 16000

    # Convert to numpy if needed (torch tensor or list)
    if hasattr(audio, "cpu"):
        audio = audio.cpu().float().numpy()
    elif not isinstance(audio, np.ndarray):
        audio = np.array(audio, dtype=np.float32)

    # soundfile expects 1D array; pipeline may return (1, N) or (N,)
    if audio.ndim > 1:
        audio = audio.squeeze()
    if audio.ndim != 1:
        raise RuntimeError(f"Unexpected audio shape: {audio.shape}")

    # Normalize to float32 in [-1, 1] if needed (use float() to avoid array truth-value ambiguity)
    if audio.dtype != np.float32:
        audio = audio.astype(np.float32)
    max_abs = float(np.abs(audio).max())
    if max_abs > 1.0:
        audio = audio / (max_abs + 1e-8)

    buf = io.BytesIO()
    try:
        sf.write(buf, audio, int(sampling_rate), format="WAV")
    except Exception as e:
        logger.warning("soundfile.write failed (%s), using wave fallback", e)
        import wave
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(int(sampling_rate))
            int_audio = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
            wav.writeframes(int_audio.tobytes())
    buf.seek(0)
    return buf.read()


@app.post("/candidate/speak")
def candidate_speak(body: SpeakRequest):
    """
    Generate speech for candidate flow.
    Body: { "text": "string", "language": "eng" | "urd" } (language optional, defaults to eng)
    Returns: WAV audio as streaming response.
    """
    logger.info("TTS request: text=%r language=%r", (body.text or "")[:80], body.language)
    try:
        wav_bytes = _generate_wav(body.text or "", body.language or "eng")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (ValueError, RuntimeError) as e:
        logger.exception("TTS error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("TTS unexpected error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    return StreamingResponse(
        io.BytesIO(wav_bytes),
        media_type="audio/wav",
        headers={
            "Content-Disposition": "inline; filename=speech.wav",
        },
    )


@app.get("/health")
def health():
    return {"ok": 1}


if __name__ == "__main__":
    uvicorn.run(
        "tts_server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
    )
