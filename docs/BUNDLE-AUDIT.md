# Bundle Size Audit — Clawglasses Website

**Build:** Next.js 14.2.21, App Router, static export, Node 18.20.8
**Date:** 2026-04-28
**Methodology:** `ANALYZE=true npm run build` -> inspected `.next/analyze/{client,nodejs,edge}.html`, cross-referenced `.next/app-build-manifest.json` and `.next/static/chunks/`. Sizes below are **gzipped over-the-wire** unless marked "parsed" (uncompressed JS) or "stat" (raw module source before webpack mangling).

---

## TL;DR

1. **`/dashboard` is 38% heavier than it needs to be.** The page eats Supabase (`303-`, 38.1 kB) plus the entire Solana stack (`356-` + `3a91511d`, 70.9 kB) plus wallet-adapter (none on this route directly, but `439-` + `648-` add another ~18 kB) — yet 90% of the dashboard's first paint is plain text + numbers. Lazy-loading the wallet flow on click and code-splitting the Solana RPC layer cuts ~70-90 kB gzip from First Load JS.
2. **Root `<WalletProvider>` is the largest unforced error.** It lives in `src/app/layout.tsx`, which means every route — including `/admin` and `/nodes`, neither of which opens a wallet — pays a hidden second-load tax for `@solana/web3.js` (107 kB parsed) the moment `Navbar`'s `WalletMultiButton` hydrates. Moving the provider into a `(wallet)` route group or dynamically importing it cuts ~25-35 kB gzip from non-wallet routes' time-to-interactive.
3. **`@solana/web3.js` is duplicated across two chunks.** Chunk `3a91511d` is a 313.8 kB stat / 107.2 kB parsed pure-`web3.js` bundle; chunk `356-` re-includes another 102.3 kB of `web3.js` modules alongside `@noble/curves` and `@solana/buffer-layout`. This is webpack's split-chunks heuristic firing twice. Consolidating saves ~15-25 kB gzip on every wallet-touching route.

**Total realistic savings on `/dashboard`'s 242 kB First Load JS: 70-110 kB gzip (29-45%).**

---

## Current state

Build output (gzipped First Load JS, ranked):

| Route       | Page size | First Load JS | Wallet UI? | Solana RPC? | Supabase? |
|-------------|-----------|---------------|------------|-------------|-----------|
| `/dashboard`| 3.88 kB   | **242 kB**    | yes (read) | yes         | yes       |
| `/mint`     | 3.07 kB   | 185 kB        | yes (write)| yes         | no        |
| `/purchase` | 2.27 kB   | 185 kB        | yes (write)| yes         | no        |
| `/`         | 2.65 kB   | 178 kB        | yes (CTA)  | yes (idle)  | no        |
| `/admin`    | 4.25 kB   | 151 kB        | no         | no          | yes       |
| `/nodes`    | 3.04 kB   | 150 kB        | no         | no          | yes       |
| _shared_    |           | 87.3 kB       |            |             |           |

Shared baseline (87.3 kB gzip) breaks down as:
- `chunks/fd9d1056-dcba7f094ce3d609.js` — 53.6 kB — React DOM production
- `chunks/117-de8a508583bec5be.js` — 31.6 kB — Next.js App Router client runtime
- other shared — 2.0 kB — webpack runtime + main-app shim

Anything above 87.3 kB on a given route is route-specific or layout-specific code.

---

## Top 10 chunks

Parsed = uncompressed JS the browser executes. Gzip = wire size. Stat = raw module source pre-mangling.

| #  | Chunk                                | Parsed   | Gzip    | Stat     | Dominant deps |
|----|--------------------------------------|----------|---------|----------|---------------|
| 1  | `fd9d1056-dcba7f094ce3d609.js`       | 168.8 kB | 53.6 kB | 172.8 kB | `react-dom` (172.8 kB stat) |
| 2  | `356-027379fe205c83e2.js`            | 144.8 kB | 45.9 kB | 603.8 kB | `@noble/curves` 177.7 + `@solana/web3.js` 102.3 + `bn.js` 88.4 + `@solana/buffer-layout` 87.7 + `@noble/hashes` 45.3 + `superstruct` 30.6 + `borsh` 20.0 |
| 3  | `303-9c19032c3e7b82f4.js`            | 141.7 kB | 38.1 kB | 574.5 kB | `@supabase/supabase-js` 416.7 + `@supabase/auth-js` 140.6 + `tslib` 17.2 |
| 4  | `framework-f66176bb897dc684.js`      | 136.7 kB | 43.8 kB | 142.9 kB | `react-dom` 128.6 + `react` 6.8 + `scheduler` 4.1 |
| 5  | `130-72c208ff9794ed3e.js`            | 127.5 kB | 39.7 kB | 357.5 kB | `@solana/wallet-adapter-react` 226.0 + `@solana-mobile/wallet-standard-mobile` 70.9 + `@solana/wallet-adapter-react-ui` 24.2 + adapters (Phantom, Solflare) 19.8 |
| 6  | `117-de8a508583bec5be.js`            | 120.6 kB | 31.6 kB | 358.9 kB | `next` App Router internals (357 kB stat) |
| 7  | `main-16ce70f2296be78a.js`           | 108.5 kB | 31.5 kB | 312.5 kB | `next` Pages Router compat shims |
| 8  | `3a91511d-2128c44e315c409b.js`       | 107.2 kB | 25.0 kB | 313.8 kB | **`@solana/web3.js` (313.8 kB stat — entire library, second copy)** |
| 9  | `44530001-97a5b39c688d1356.js`       |  52.9 kB | 11.7 kB | 215.6 kB | `@supabase/auth-js` `GoTrueClient.js` (215.6 kB stat — single file) |
| 10 | `44.71ac11c692cb8dc0.js`             |  30.5 kB |  6.6 kB |  67.5 kB | `@solflare-wallet/sdk` 67.5 (lazy, loads on Solflare select) |

Notable below the top 10: `883-` (27.8 kB parsed / 8.5 kB gzip) is the `buffer`/`process`/`base64-js`/`ieee754` browserify polyfills web3.js requires on every route in the layout's chunk graph.

---

## Recommendations (priority order)

Each item is numbered. Savings are **gzip on `/dashboard`** unless noted (it's the worst route and the one most worth optimizing). Risk is engineering risk to ship cleanly, not user-facing risk.

### R1. Lift `<WalletProvider>` out of root layout
**Expected savings:** 25-35 kB gzip on `/admin` + `/nodes` First Load JS (151 kB -> ~120 kB). **Cascading:** unlocks R2.
**Risk:** medium — touches every page that uses wallet hooks; needs route grouping.
**Why it matters:** `src/app/layout.tsx:96` wraps the entire tree in `<WalletProvider>`. `<WalletProvider>` imports from `@solana/wallet-adapter-react` and `@solana/wallet-adapter-react-ui`, which transitively pull `@solana/web3.js`. Although Next.js's per-route splitting prevents `/admin` from loading chunk `130-` directly, the polyfill chunk `883-` (8.5 kB) plus shared layout chunks still ship Solana primitives to every route.

**Implementation sketch:**
1. Convert wallet routes to a route group: `src/app/(wallet)/{layout.tsx,mint,purchase,dashboard,page.tsx}/`. The `(wallet)` directory does not appear in URLs.
2. Move `<WalletProvider>` from `src/app/layout.tsx` into `src/app/(wallet)/layout.tsx`. Root layout keeps Navbar (without `WalletMultiButton`) and global styles.
3. For Navbar: extract a `<WalletButtonSlot>` client component that's only mounted inside `(wallet)/layout.tsx`. On `/admin` and `/nodes`, render a "Connect" `<Link href="/dashboard">` placeholder instead.
4. Rebuild and verify `/admin`'s First Load JS drops below 130 kB.

### R2. Dynamic-import `<WalletMultiButton>` and the wallet modal
**Expected savings:** 30-50 kB gzip on `/dashboard`, 15-25 kB on `/mint` + `/purchase` (deferred to user click).
**Risk:** low — `next/dynamic` is the supported path; no API surface change.
**Why it matters:** `WalletMultiButton` is the entry point for `WalletModalProvider`, `qrcode.js` (14.8 kB stat), and the wallet picker UI — none of which are needed until the user clicks "Connect Wallet". On `/dashboard`, that button is in the header and probably 80% of users never click it because they're already connected via auto-connect cookies.

**Implementation sketch:**
```ts
// src/components/WalletButton.tsx (new file)
import dynamic from "next/dynamic";
export const WalletButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(m => m.WalletMultiButton),
  { ssr: false, loading: () => <button className="...">Connect Wallet</button> }
);
```
Replace every `import { WalletMultiButton }` with `import { WalletButton }` from `@/components/WalletButton`. Leave wallet hooks (`useWallet`, `useConnection`) as static imports — they're cheap and live in the provider scope.

### R3. Dynamic-import `@solana/web3.js` at the call site, not at module load
**Expected savings:** 25-50 kB gzip on `/dashboard` (web3.js moves out of the critical path).
**Risk:** medium — every consumer of `Connection`, `PublicKey`, `Transaction` has to be touched.
**Why it matters:** `@solana/web3.js` ships **313.8 kB stat / 107.2 kB parsed / 25 kB gzip** as chunk `3a91511d`, plus another 102 kB stat duplicated inside chunk `356-`. The library itself is famously not tree-shakeable: importing `Connection` pulls every transaction primitive, every program client, every base58 codec. The `Connection` object is only needed at fetch-time on `/dashboard`.

**Implementation sketch:**
```ts
// src/hooks/useTokenBalance.ts — currently imports web3.js statically via wallet-adapter
// New pattern: fetch lazily on first effect
useEffect(() => {
  let cancelled = false;
  (async () => {
    const { Connection, PublicKey } = await import("@solana/web3.js");
    const { getAssociatedTokenAddress, getAccount } = await import("@solana/spl-token");
    // ... existing logic ...
    if (!cancelled) setBalance(amount);
  })();
  return () => { cancelled = true; };
}, [publicKey]);
```
This pushes web3.js into a deferred chunk loaded after first paint. The dashboard's "Loading balance..." state already exists, so the perceived UX is identical.

### R4. Split Supabase client by surface
**Expected savings:** 15-25 kB gzip on `/dashboard` (auth-js moves out of read-only paths).
**Risk:** low — Supabase already ships subpath imports.
**Why it matters:** Chunk `44530001` is **52.9 kB parsed / 11.7 kB gzip** of `GoTrueClient.js` alone. `@supabase/supabase-js` re-exports the auth client by default — `createClient()` always pulls GoTrueClient even if you only call `.from('nodes').select()`. The dashboard reads node + reward data; admin writes it. Only admin truly needs auth-js.

**Implementation sketch:**
```ts
// src/lib/supabase/api.ts — read-only path used by /, /nodes, /dashboard
import { createClient } from "@supabase/supabase-js";
export const supabaseAnon = createClient(URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
// passing { auth: { persistSession: false } } lets webpack DCE most of GoTrueClient
```
For `/admin`, keep the full client. Verify by re-running `npm run analyze` and confirming chunk `44530001` is no longer in `/dashboard`'s manifest.

### R5. Replace `bs58` / `bn.js` polyfills where browser-native APIs work
**Expected savings:** 5-10 kB gzip across all wallet routes.
**Risk:** medium — `bs58` and `bn.js` are pulled transitively, so the win depends on whether your direct call sites can be replaced.
**Why it matters:** Chunk `356-` ships **88.4 kB stat of `bn.js`** plus `@solana/buffer-layout` plus `text-encoding-utf-8`. `bn.js` exists because web3.js predates `BigInt`. If you have direct `bn.js` or `bs58` imports in your own code, the user's modern browser has `BigInt` natively and base58 can be a 30-line function. If the imports are only transitive through web3.js, this savings collapses into R3 — track it there.

**Implementation sketch:**
```bash
# audit your direct usage
grep -rn "from \"bs58\"\|from \"bn.js\"\|require(\"bs58\")" src/
```
If hits exist: write a 30-line `src/lib/base58.ts` using the standard alphabet `123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`. Use `BigInt` for arithmetic. Replace direct imports. Keep web3.js's internal copies — those move with R3.
If no direct hits: skip R5, the dep is locked behind web3.js.

### R6. Preload critical chunks on wallet routes
**Expected savings:** TTI improvement, not byte savings — but ~150-300 ms perceived faster on /dashboard.
**Risk:** low — `<link rel="modulepreload">` is browser-native.
**Implementation sketch:** Add explicit preload hints in `(wallet)/layout.tsx` for the dashboard's data fetch chunk so it lands in parallel with the React hydration:
```tsx
<link rel="modulepreload" href="/_next/static/chunks/3a91511d-2128c44e315c409b.js" />
```
Only do this **after** R3 — preloading a chunk you're about to remove is wasted bytes. Use the chunk hash from the post-R3 build.

### R7. Disable wallet `autoConnect` until after First Contentful Paint
**Expected savings:** TTI only — same bytes, later execution.
**Risk:** low.
**Why it matters:** `src/providers/WalletProvider.tsx` sets `autoConnect`. Auto-connect runs storage reads + RPC ping during hydration, which pins web3.js to the critical path even if the user never clicks anything. Defer it:
```tsx
const [armed, setArmed] = useState(false);
useEffect(() => {
  const id = requestIdleCallback(() => setArmed(true), { timeout: 1500 });
  return () => cancelIdleCallback(id);
}, []);
return <SWP wallets={wallets} autoConnect={armed}>...</SWP>;
```

---

## What we DID NOT recommend

| Tempting bad idea | Why we skipped |
|-------------------|----------------|
| Replace `@solana/web3.js` with a slimmer fork or `solana-web3-tiny` | Community trust matters more than 80 kB. Every Solana dApp ships web3.js; deviating from the canonical SDK is a multi-week audit cost (RPC quirks, websocket reconnection, transaction signing edge cases) for the benefit of one number on one report. |
| Switch to a different wallet adapter ecosystem (e.g., `@wallet-standard/react`) | Same logic. Phantom and Solflare both publish `@solana/wallet-adapter-*` integrations; rolling our own breaks parity with every Solana frontend the user has used. |
| Replace `@supabase/supabase-js` with raw `fetch` calls to PostgREST | The savings (~30-40 kB) are real but you lose typed queries, RLS auto-routing, and the realtime channel. Phase-2 product needs realtime for node status updates. |
| Aggressively shake `react-dom` | React DOM 18 is what it is; the production min bundle (172.8 kB stat / 53.6 kB gzip) is already shaken. Pretending otherwise wastes a day. |
| Convert pages to RSC to "remove" client JS | Wallet adapter is fundamentally client-only (it touches `window.solana`). RSC migration is right for `/admin` and `/nodes` (which only read Supabase) but it's a structural change, not a bundle audit deliverable. Track separately. |
| Replace `bn.js` with `BigInt` polyfill | `BigInt` is supported everywhere we ship; we don't need a polyfill. Direct replacement of our own `bn.js` usage is R5. |
| Code-split by manually reading webpack output and forcing chunk names | Next.js 14's chunk heuristic is good; manual `webpackChunkName` pragmas on dynamic imports are fine, but rewriting `splitChunks` config in `next.config.mjs` is a footgun that breaks on Next upgrades. |

---

## Phase-2 implementation order

Compounding wins — each step makes the next easier to measure.

**Sprint 1 (1-2 days, low risk, big perceived win):**
1. R2 — dynamic-import `WalletMultiButton`. Easiest, isolated, 30-50 kB on three routes. Ship first to prove the audit is real.
2. R7 — defer `autoConnect`. Ten-line change. Helps every wallet route's TTI.

**Sprint 2 (2-3 days, structural):**
3. R1 — route group + lift `WalletProvider`. This is the unlock. Once `/admin` + `/nodes` no longer carry layout-level wallet imports, the chunk graph rebalances and R3 becomes a clean cut.
4. R4 — split Supabase by surface. Independent of R1-R3, but ship in the same sprint so the dashboard's full-stack savings land together.

**Sprint 3 (3-5 days, surgical):**
5. R3 — dynamic-import web3.js at call sites. Touches `useTokenBalance`, `useSendTransaction`, mint/purchase pages. Test plan: confirm wallet flows still work in Phantom + Solflare, on Chrome desktop + mobile Safari, on devnet + mainnet-beta. This is the highest-risk recommendation but it pays off most: the `3a91511d` chunk (25 kB gzip) literally disappears from the dashboard's first-load critical path.
6. R5 — only if R5's audit grep returns hits. Probably skip.

**Sprint 4 (post-merge tuning):**
7. R6 — preload tuning. Re-run `npm run analyze`, pick new chunk hashes, add `<link rel="modulepreload">` to the wallet route group layout.

**Expected end state:** `/dashboard` First Load JS drops from **242 kB to 130-150 kB** (38-46% reduction). `/admin` + `/nodes` drop from 150-151 kB to ~110 kB. Time-to-interactive on `/dashboard` improves by 400-700 ms on a mid-tier 4G connection.

---

## How to reproduce this audit

```bash
npm install
npm run analyze     # writes .next/analyze/{client,nodejs,edge}.html
open .next/analyze/client.html
```

The analyzer is gated on `ANALYZE=true` via `next.config.mjs`, so plain `npm run build` (Vercel, CI, local) is unaffected. The reports are not committed; regenerate per audit.

For per-route chunk attribution: read `.next/app-build-manifest.json` after a build — it maps every route to its chunk list. Combined with the analyzer's `chartData` JSON (embedded at the bottom of `client.html`), you can reproduce every number in this document.
