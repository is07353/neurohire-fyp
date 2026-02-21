/**
 * TTS hook for candidate flow only. Caches last generated audio per (text, language)
 * to avoid repeated calls. Do not import in recruiter, company, or super-admin.
 */
import { useCallback, useRef, useState } from 'react';

export type TtsLanguage = 'eng' | 'urd';

export interface SpeakEntry {
  text: string;
  language: TtsLanguage;
}

interface CacheEntry {
  url: string;
  text: string;
  language: TtsLanguage;
}

function languageToTts(lang: 'english' | 'urdu' | null): TtsLanguage {
  return lang === 'urdu' ? 'urd' : 'eng';
}

async function playOnePhrase(
  base: string,
  text: string,
  lang: TtsLanguage,
  cacheRef: { current: CacheEntry | null },
  setPlaying: (v: boolean) => void,
  setError: (v: string | null) => void,
): Promise<void> {
  const t = (text || '').trim();
  if (!t) return;
  setError(null);

  // Play from cache if we have this exact phrase (e.g. preloaded), so first phrase starts immediately
  const cached = cacheRef.current;
  if (cached && cached.text === t && cached.language === lang && cached.url) {
    return new Promise((resolve, reject) => {
      const a = new Audio(cached.url);
      a.onended = () => {
        setPlaying(false);
        resolve();
      };
      a.onerror = () => {
        setPlaying(false);
        setError('Audio playback failed');
        reject(new Error('Audio playback failed'));
      };
      setPlaying(true);
      a.play().then(() => {}).catch((err) => {
        setPlaying(false);
        reject(err);
      });
    });
  }

  const res = await fetch(`${base}/candidate/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: t, language: lang }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `TTS failed: ${res.status}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  if (cacheRef.current?.url) {
    try {
      URL.revokeObjectURL(cacheRef.current.url);
    } catch {
      /* ignore */
    }
  }
  cacheRef.current = { url: objectUrl, text: t, language: lang };
  return new Promise((resolve, reject) => {
    const a = new Audio(objectUrl);
    a.onended = () => {
      setPlaying(false);
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* ignore */
      }
      resolve();
    };
    a.onerror = () => {
      setPlaying(false);
      setError('Audio playback failed');
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* ignore */
      }
      reject(new Error('Audio playback failed'));
    };
    setPlaying(true);
    a.play().then(() => {}).catch((err) => {
      setPlaying(false);
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* ignore */
      }
      reject(err);
    });
  });
}

export function useTts(language: 'english' | 'urdu' | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<CacheEntry | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
      a.src = '';
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const t = (text || '').trim();
      if (!t || !language) return;

      const ttsLang = languageToTts(language);

      // Reuse cached audio if same text and language
      const cached = cacheRef.current;
      if (cached && cached.text === t && cached.language === ttsLang && cached.url) {
        stop();
        const a = new Audio(cached.url);
        audioRef.current = a;
        a.onplay = () => setIsPlaying(true);
        a.onended = () => {
          setIsPlaying(false);
          if (audioRef.current === a) audioRef.current = null;
        };
        a.onerror = () => {
          setError('Audio playback failed');
          setIsPlaying(false);
        };
        await a.play().catch(() => setIsPlaying(false));
        return;
      }

      // Revoke previous cache URL to avoid leaks
      if (cached?.url) {
        try {
          URL.revokeObjectURL(cached.url);
        } catch {
          // ignore
        }
        cacheRef.current = null;
      }

      setError(null);
      stop();

      const base = (await import('./getTtsBase')).getTtsBase();
      const url = `${base}/candidate/speak`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: t, language: ttsLang }),
        });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail || `TTS failed: ${res.status}`);
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        cacheRef.current = { url: objectUrl, text: t, language: ttsLang };

        const a = new Audio(objectUrl);
        audioRef.current = a;
        a.onplay = () => setIsPlaying(true);
        a.onended = () => {
          setIsPlaying(false);
          if (audioRef.current === a) audioRef.current = null;
        };
        a.onerror = () => {
          setError('Audio playback failed');
          setIsPlaying(false);
        };
        await a.play().catch(() => setIsPlaying(false));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'TTS request failed';
        setError(msg);
      }
    },
    [language, stop],
  );

  const speakSequence = useCallback(
    async (entries: SpeakEntry[]) => {
      stop();
      setError(null);
      const base = (await import('./getTtsBase')).getTtsBase();
      for (let i = 0; i < entries.length; i++) {
        const { text, language: lang } = entries[i];
        try {
          await playOnePhrase(base, text, lang, cacheRef, setIsPlaying, setError);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'TTS failed';
          setError(msg);
          return;
        }
      }
    },
    [stop],
  );

  /** Preload a phrase so it plays immediately when speakSequence runs (reduces delay after clicking Enable). */
  const preload = useCallback(async (entry: SpeakEntry) => {
    const t = (entry.text || '').trim();
    if (!t) return;
    const base = (await import('./getTtsBase')).getTtsBase();
    if (cacheRef.current?.text === t && cacheRef.current?.language === entry.language) return;
    try {
      const res = await fetch(`${base}/candidate/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, language: entry.language }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (cacheRef.current?.url) {
        try {
          URL.revokeObjectURL(cacheRef.current.url);
        } catch {
          /* ignore */
        }
      }
      cacheRef.current = { url: objectUrl, text: t, language: entry.language };
    } catch {
      /* ignore preload errors */
    }
  }, []);

  return { speak, speakSequence, preload, stop, isPlaying, error };
}
