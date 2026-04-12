// TODO: set NEXT_PUBLIC_API_URL in .env — base URL of the backend API (e.g. http://localhost:4000)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Fallback shown in AIInsightPanel when the backend is unreachable. */
export const MOCK_INSIGHT = {
  risk: "Unknown",
  summary:
    "AI insight backend is not configured. Set NEXT_PUBLIC_API_URL in .env to enable live risk analysis.",
};

/**
 * Performs a GET request to the backend API.
 * @param path - Relative path including leading slash, e.g. `/ai/risk/0x123`.
 */
export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} returned ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Performs a POST request to the backend API.
 * @param path - Relative path including leading slash.
 * @param body - JSON-serialisable request body.
 */
export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST ${path} returned ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
