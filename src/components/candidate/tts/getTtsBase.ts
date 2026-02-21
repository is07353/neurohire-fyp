/**
 * TTS API base URL – used only by candidate flow.
 * With Vite dev proxy: /tts -> TTS server (e.g. 8001).
 * Set VITE_TTS_URL in .env to call TTS directly (e.g. http://127.0.0.1:8001) if proxy drops the body.
 */
export function getTtsBase(): string {
  const env = (import.meta as unknown as { env?: { VITE_TTS_URL?: string } }).env;
  const direct = env?.VITE_TTS_URL?.trim();
  if (direct) {
    return direct.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/tts`;
  }
  return 'http://127.0.0.1:8001';
}
