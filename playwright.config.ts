import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — alpha-launch invariant suite.
 *
 * Three invariants this config supports (see e2e/README.md):
 *   1. Alpha banner present on every public route.
 *   2. /admin returns 404 to anonymous visitors.
 *   3. Admin column names (`simulated_slots`, `is_simulated`) never
 *      reach the public DOM or any chunk JS that loads on /nodes.
 *
 * Phase-1 scope: chromium only — keep CI fast and deterministic.
 * Firefox + WebKit projects can be added in phase-2 once the
 * baseline is green and Vercel preview-environment runs are wired up.
 */
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Each spec is independent — let Playwright parallelize within a project.
  fullyParallel: true,
  // No `.only` left behind in CI.
  forbidOnly: !!process.env.CI,
  // One retry on CI to absorb cold-start flakes (no retries locally so
  // real failures fail fast and loud).
  retries: process.env.CI ? 1 : 0,
  // Cap workers on CI to avoid noisy-neighbor issues on shared runners.
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // The alpha banner literal contains CJK + ASCII — make sure the
    // browser respects UTF-8 on every page.
    locale: "en-US",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Boot the production server before the tests run; reuse a server the
  // developer already has running locally to keep the inner loop fast.
  webServer: {
    command: "npm start",
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
