import { test, expect } from "@playwright/test";

/**
 * Invariant 1 — alpha banner is present on every public route.
 *
 * The banner lives in src/app/layout.tsx (root layout), so every
 * route under /app inherits it. We assert the literal copy that
 * legal/PR signed off on, in two parts:
 *
 *   a) the bilingual marker  "Closed alpha · 演示阶段"
 *   b) the "no real value" disclaimer sentence
 *
 * Both must be present on every public page. /admin is intentionally
 * 404 in the alpha deploy and is covered by admin-gate.spec.ts.
 */
const PUBLIC_ROUTES = ["/", "/mint", "/nodes", "/purchase", "/dashboard"] as const;

const BANNER_MARKER = "Closed alpha · 演示阶段";
const BANNER_DISCLAIMER =
  "Numbers shown are demonstrative. On-chain program not yet deployed; no real value moves.";

for (const route of PUBLIC_ROUTES) {
  test(`alpha banner is visible on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });

    // Use getByText with exact: true so a future copy tweak fails loud
    // instead of silently matching a substring.
    const marker = page.getByText(BANNER_MARKER, { exact: true });
    await expect(marker).toBeVisible();

    const disclaimer = page.getByText(BANNER_DISCLAIMER, { exact: true });
    // The disclaimer is hidden on small viewports (`hidden sm:inline`) but
    // Desktop Chrome (1280×720 default) is wide enough to render it. If
    // a future viewport tweak hides it, this test catches the regression.
    await expect(disclaimer).toBeVisible();
  });
}
