import { test, expect } from "@playwright/test";

/**
 * Invariant 2 — /admin returns 404 to anonymous visitors.
 *
 * The route in src/app/admin/page.tsx calls `notFound()` from
 * `next/navigation` whenever `process.env.NEXT_PUBLIC_ADMIN_ENABLED`
 * is not the literal string "true". The alpha Vercel deploy does
 * NOT set that env, so anon visitors get the framework 404 page.
 *
 * We assert BOTH the HTTP status (404) AND the rendered text the
 * Next.js default not-found page emits. Either signal alone is
 * enough to lock the contract; together they catch the case where
 * a regression turns it into a soft-404 (200 + "page not found") or
 * a real-404 with a styled custom message that drops the canonical
 * copy.
 */
test("/admin returns 404 to anonymous visitors", async ({ page }) => {
  const response = await page.goto("/admin", { waitUntil: "domcontentloaded" });

  // Response can be null only on aborted navigations — `goto` on a
  // valid origin always resolves to a Response.
  expect(response, "navigation produced no response").not.toBeNull();
  expect(response!.status(), "expected 404 status from /admin").toBe(404);

  // Next.js's default not-found page renders this exact phrase. If a
  // future custom not-found.tsx replaces it, update the literal here.
  await expect(page.getByText("This page could not be found")).toBeVisible();
});
