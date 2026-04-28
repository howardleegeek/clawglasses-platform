# Alpha-Launch Invariant E2E Suite

Playwright tests that lock in the three contracts the closed-alpha
deploy of clawglasses.com must never break.

## The three invariants

1. **Alpha banner on every public route** — `alpha-banner.spec.ts`
   asserts the bilingual `Closed alpha · 演示阶段` marker and the
   "no real value moves" disclaimer render on `/`, `/mint`, `/nodes`,
   `/purchase`, and `/dashboard`.

2. **/admin is 404 to anonymous visitors** — `admin-gate.spec.ts`
   asserts both the HTTP `404` status and the framework's
   `This page could not be found` copy. Driven by
   `NEXT_PUBLIC_ADMIN_ENABLED` (left unset in alpha).

3. **No admin column names leak to the public DOM on /nodes** —
   `no-leak.spec.ts` greps `page.content()` and the body of every
   script tag the page loads for `simulated_slots` and `is_simulated`.
   Runtime backstop for `scripts/check-no-simulated-leak.sh`.

## Run locally

```bash
npm install              # picks up @playwright/test
npm run test:install     # one-time chromium download
npm run build            # tests run against `npm start`
npm test                 # Playwright boots the server and runs the suite
```

These tests guard the alpha launch contract — keep them green
before every deploy.
