/**
 * HTTP helpers shared across edge functions.
 *
 * `jsonResponse` enforces a consistent envelope and — critically — never
 * lets `is_simulated` leak to the public response. The simulated-stake
 * routing happens INSIDE the functions; callers only see aggregate stats.
 */

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

const FORBIDDEN_PUBLIC_KEYS = ["is_simulated"] as const;

/**
 * Recursively strips fields that must never appear in public responses.
 * Used as a defence-in-depth in case a future refactor accidentally
 * forwards a DB row.
 */
function stripForbidden<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripForbidden(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if ((FORBIDDEN_PUBLIC_KEYS as readonly string[]).includes(k)) continue;
      out[k] = stripForbidden(v);
    }
    return out as unknown as T;
  }
  return value;
}

export function jsonResponse<T>(body: T, init: ResponseInit = {}): Response {
  const safe = stripForbidden(body);
  return new Response(JSON.stringify(safe), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers ?? {}) },
  });
}

export function errorResponse(err: unknown, status = 500): Response {
  const message = err instanceof Error ? err.message : String(err);
  return jsonResponse({ error: message }, { status });
}
