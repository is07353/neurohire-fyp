/**
 * API base URL for the FastAPI backend.
 * When the app is opened via ngrok, same-origin + /api is proxied by Vite to the backend (no CORS).
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://127.0.0.1:8000';
}
