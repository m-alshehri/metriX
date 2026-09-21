import "server-only";

/** Bounds both connection time and response-body reads. */
export async function fetchJson(
  url: string | URL,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<any> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  if (!response.ok)
    throw new Error(`Upstream request failed (${response.status})`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Upstream returned invalid JSON");
  }
}
