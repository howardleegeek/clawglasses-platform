/**
 * CSP violation report endpoint.
 *
 * Browsers POST here whenever the CSP-Report-Only or enforcing CSP catches
 * a directive violation. We log the structured payload to the Vercel
 * function log; aggregation/alerting is a phase-2 concern (e.g. ship to
 * Sentry, Datadog, or a PostgreSQL row).
 *
 * Two payload formats coexist in 2026:
 *   1. Legacy CSP report (rfc7469-flavored):
 *      Content-Type: application/csp-report
 *      Body: { "csp-report": { "document-uri": ..., "violated-directive": ..., ... } }
 *   2. Modern Reporting API:
 *      Content-Type: application/reports+json
 *      Body: [{ "type": "csp-violation", "body": { "documentURL": ..., "effectiveDirective": ..., ... }, ... }]
 *
 * We accept both. We DO NOT reflect the body back, set CORS, or echo any
 * caller data into a response — the response is always 204 No Content.
 *
 * Why no auth:
 *   CSP reports are cross-origin POSTs from random user browsers — adding
 *   auth would defeat the purpose. Rate-limiting via Vercel's edge layer
 *   is sufficient. If we ever ship to a paid telemetry provider, gate via
 *   a server-side env secret, not a browser-visible header.
 */
import { NextRequest } from "next/server";

// Mark as edge-compatible if Vercel runtime supports it; falls back to node otherwise.
// Edge is preferred because CSP reports are high-volume + tiny.
export const runtime = "edge";

// Cap accepted payload size — defensive against abuse.
const MAX_BODY_BYTES = 8 * 1024;

interface NormalizedReport {
  source: "legacy" | "reporting-api" | "unknown";
  documentUri?: string;
  violatedDirective?: string;
  blockedUri?: string;
  effectiveDirective?: string;
  disposition?: string;
  userAgent?: string;
  timestamp: string;
}

function normalize(payload: unknown, ua: string | null): NormalizedReport[] {
  const ts = new Date().toISOString();
  if (!payload || typeof payload !== "object") {
    return [{ source: "unknown", userAgent: ua ?? undefined, timestamp: ts }];
  }

  // Legacy: { "csp-report": {...} }
  const legacy = (payload as Record<string, unknown>)["csp-report"];
  if (legacy && typeof legacy === "object") {
    const r = legacy as Record<string, string>;
    return [
      {
        source: "legacy",
        documentUri: r["document-uri"],
        violatedDirective: r["violated-directive"],
        blockedUri: r["blocked-uri"],
        effectiveDirective: r["effective-directive"],
        disposition: r["disposition"],
        userAgent: ua ?? undefined,
        timestamp: ts,
      },
    ];
  }

  // Reporting API: array of { type, body }
  if (Array.isArray(payload)) {
    return payload
      .filter(
        (entry): entry is { type: string; body: Record<string, string> } =>
          !!entry &&
          typeof entry === "object" &&
          (entry as { type?: unknown }).type === "csp-violation",
      )
      .map((entry) => ({
        source: "reporting-api" as const,
        documentUri: entry.body.documentURL,
        violatedDirective: entry.body.effectiveDirective,
        blockedUri: entry.body.blockedURL,
        effectiveDirective: entry.body.effectiveDirective,
        disposition: entry.body.disposition,
        userAgent: ua ?? undefined,
        timestamp: ts,
      }));
  }

  return [{ source: "unknown", userAgent: ua ?? undefined, timestamp: ts }];
}

export async function POST(req: NextRequest): Promise<Response> {
  // Body size guard.
  const lenHeader = req.headers.get("content-length");
  if (lenHeader && Number.parseInt(lenHeader, 10) > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    // Some browsers send invalid JSON; we still want a 204 to avoid
    // teaching the browser to retry / fall back / error-spam our logs.
    return new Response(null, { status: 204 });
  }

  const reports = normalize(payload, req.headers.get("user-agent"));

  // Structured log line per report — Vercel captures this automatically.
  // Use a stable prefix so a future log filter / alert rule can match.
  for (const report of reports) {
    // eslint-disable-next-line no-console
    console.warn("[csp-report]", JSON.stringify(report));
  }

  return new Response(null, { status: 204 });
}

// Block accidental GET probes — return 405 so monitoring tools see a clear
// "wrong method" rather than a ghost 200.
export async function GET(): Promise<Response> {
  return new Response(null, {
    status: 405,
    headers: { Allow: "POST" },
  });
}
