import { test, expect, type Page } from "@playwright/test";

/**
 * Invariant 3 — admin column names never reach the public DOM on /nodes.
 *
 * The alpha guarantee is that simulated stakes are indistinguishable
 * from real ones on every public surface (PRD v4 §4). The admin-only
 * column names `simulated_slots` and `is_simulated` exist in:
 *   - the supabase schema (server-side only)
 *   - src/app/admin/** (gated route)
 *   - src/lib/supabase/admin-api.ts (admin types)
 *
 * scripts/check-no-simulated-leak.sh blocks them at build time. This
 * spec is the runtime backstop: even if a future refactor accidentally
 * imports an admin module into a public chunk, this test catches it
 * by inspecting the rendered HTML and every chunk JS the page actually
 * loads in the browser.
 */
const FORBIDDEN = ["simulated_slots", "is_simulated"] as const;

/**
 * Fetch a script body using the test's request context so cookies
 * and base URL are inherited from the page. Returns the raw text
 * body or throws — we want a hard failure if a referenced chunk
 * cannot be retrieved (it would mean the page is broken in CI).
 */
async function fetchScriptBody(page: Page, src: string): Promise<string> {
  const response = await page.request.get(src);
  expect(
    response.ok(),
    `script ${src} returned status ${response.status()}`
  ).toBe(true);
  return await response.text();
}

test("/nodes does not leak admin column names in HTML or chunk JS", async ({
  page,
}) => {
  // `networkidle` waits for the client-side fetch in the useEffect to
  // settle, so any chunks pulled in lazily by the data layer are also
  // listed in `document.scripts` by the time we read it.
  await page.goto("/nodes", { waitUntil: "networkidle" });

  // 1. Full rendered HTML — covers SSR markup + any text the client
  //    rendered into the DOM.
  const html = await page.content();
  for (const needle of FORBIDDEN) {
    expect(
      html.includes(needle),
      `forbidden token "${needle}" found in /nodes HTML`
    ).toBe(false);
  }

  // 2. Every script tag the page loaded. We collect absolute URLs only
  //    (inline scripts are part of `page.content()` and already checked
  //    above). De-duplicate so we don't refetch the same chunk twice.
  const scriptSrcs = await page.evaluate(() =>
    Array.from(document.scripts)
      .map((s) => s.src)
      .filter((s) => typeof s === "string" && s.length > 0)
  );
  const uniqueSrcs = Array.from(new Set(scriptSrcs));
  expect(
    uniqueSrcs.length,
    "page loaded zero external scripts — likely a routing or SSR regression"
  ).toBeGreaterThan(0);

  for (const src of uniqueSrcs) {
    const body = await fetchScriptBody(page, src);
    for (const needle of FORBIDDEN) {
      expect(
        body.includes(needle),
        `forbidden token "${needle}" found in script ${src}`
      ).toBe(false);
    }
  }
});
