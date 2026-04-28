# Security posture — Clawglasses Proof of Sight

Written 2026-04-25 after a parallel red/blue exercise on commit `9968639`.
Updated alongside any commit that materially changes attack surface.

This file is the source of truth for what we know is exploitable, what we
have shipped against it, and what we are explicitly accepting until later
phases can close it. **Anyone touching `app/(app)/admin/`, `lib/sight/mint/*`,
or `db/schema.sql` must read this file first.**

---

## §A — `is_simulated` leak (CRITICAL → patched)

**Threat.** PRD v4 §4 demands that simulated stakes be indistinguishable from
real ones on every public surface. The original admin page hard-coded
`MOCK_NODES` with literal `sim:4`, `sim:8` values inside a client component;
Next.js bundled those values into a static JS chunk that any visitor could
fetch with a guessable URL. Both red and blue teams identified this.

**Patch shipped (this commit).**
1. `MOCK_*` constants removed from `app/(app)/admin/page.tsx`. Replaced with
   `PLACEHOLDER_*` whose values are zeros, dashes, or `paused: true`.
2. `scripts/check-no-simulated-leak.sh` blocks any future regression — exits
   non-zero if `is_simulated` or `AdminStake` appear outside the admin
   perimeter, OR if the literal string `"simulated"` appears in any non-admin
   built chunk under `dist/`.
3. `prebuild` and `build` npm scripts both run the guard.

**Residual risk.** Phase 2 wires Supabase reads of `is_simulated` into the
admin dashboard. The moment a typed Supabase row destructure forgets to
strip the field, the leak comes back. The grep guard catches *source-tree*
leaks; the bundle scan catches *build-output* leaks. Both must remain green.

**Type-system invariant.** `lib/sight/mint/types.ts` exports two shapes:
`Stake` (public-safe, no `is_simulated`) and `AdminStake` (admin-only).
NEVER add a union or discriminator that lets a `Stake` carry the field.

---

## §B — Admin allowlist bypass (CRITICAL → patched)

**Threat.** `app/(app)/admin/page.tsx` previously contained
`if (ADMIN_ALLOWLIST.length === 0) return true;` — granting admin to every
connected wallet whenever the env var was missing. Vercel's first deploy
ships with no env vars set; the dashboard was therefore wide-open until
Howard remembered to flip a switch.

**Patch shipped (this commit).** Now `return false`. If
`NEXT_PUBLIC_ADMIN_WALLETS` is unset, no wallet is admin. Operators must
deliberately populate the env var.

**Residual risk.**
1. The check is still purely client-side. An attacker with DevTools can
   override `isAdmin` to `true`. Until a server-side or smart-contract
   gate exists, every admin button is decorative against a determined
   attacker; the only real protection is **Supabase RLS on the
   `admin_config` table**. RLS in `db/schema.sql` is correctly written but
   requires Supabase Auth to mint a JWT bound to a verified wallet
   signature — that infra is not yet built.
2. The chunk URL is still public. Even with the gate, JS source ships.
   Phase 2 will move actual mutation calls into `'server'` Anchor program
   instructions so the client cannot forge them.

---

## §C — Treasury pubkey swap via build env var (HIGH → mitigated, full fix Phase 2)

**Threat.** `NEXT_PUBLIC_SIGHT_TREASURY` is consumed at build time. A
compromised CI run, a typo in the Vercel dashboard, or a malicious PR can
silently redirect every mint fee.

**Mitigation today.** No code change in this commit, but documented here:
treasury operators MUST verify the deployed bundle's treasury pubkey
matches the canonical address before promoting a build to production.
A `lib/sight/treasury-pin.ts` module that asserts `env === CANONICAL` is
written down in the blue-team report; we will land it the moment Howard
shares the canonical pubkey.

**Residual risk.** Until the pin module ships and the canonical pubkey is
hard-coded, treasury redirection is a one-env-var attack.

---

## §D — Bonding-curve front-run (HIGH → architectural, Phase 3 blocker)

**Threat.** `currentPrice(totalMinted)` is JavaScript on the client.
Nothing on-chain enforces that a mint burns the right amount of $SIGHT —
the Bubblegum mintV1 instruction does not include the SPL burn. Red team
showed how to construct a custom transaction that mints at T1 cost while
the network is at T8. Direct bonding-curve breaker.

**Status.** NOT patchable in the static-export website alone. Requires the
`clawglasses_nft` Anchor program (PRD §12) to escrow burn-and-mint atomically
with on-chain price math reading from a `mint_state` PDA. Until that program
ships, mint pricing is honor-system. We accept this for Phase 0 because no
real $SIGHT mainnet liquidity exists yet — the cost of exploiting equals the
cost of acquiring testSIGHT.

**Phase 3 unblocker.** Land `programs/clawglasses_nft/` per PRD §12.

---

## §E — Unverified collection / cNFT spoofing (HIGH → architectural, Phase 1 task)

**Threat.** `lib/sight/mint/client.ts` calls `mintV1` with
`collection.verified = false` and `creators[0].verified = false`. Anyone can
mint cNFTs into the same collection key with no on-chain verification step.
Marketplaces that trust the collection key alone will display fakes
alongside real items, and a future staking flow that filters NFTs by
collection key alone will accept fakes.

**Phase 1 unblocker.** Add a `verifyCollection` instruction signed by the
collection authority immediately after `mintV1`, in the same transaction.
This requires the treasury keypair to be the collection authority — which
it currently is per the env config.

**Status.** Listed for the next code commit.

---

## §F — RPC poisoning + `NEXT_PUBLIC_SIGHT_RPC` leakage (HIGH → mitigated)

**Threat.** `NEXT_PUBLIC_SIGHT_RPC` ships as a build-time constant. A
typosquat domain serving the same bundle with a swapped RPC URL can
fabricate `getBalance` / `getAccountInfo` responses while signing real
draining transactions.

**Mitigation today.** Documented here. A future origin-allowlist guard
inside `app/sight/WalletProviders.tsx` will refuse to mount the wallet
adapter unless `window.location.hostname` is in
`['clawglasses.com', 'clawglasses.vercel.app', 'localhost']`. Land this in
the next commit.

**Operator action.** Use a Helius / Alchemy URL with a domain-restricted
API key (set the allowed origins on the RPC provider's dashboard) — the
key in the bundle is then useless from any other origin.

---

## §G — Supply chain (HIGH → partially mitigated)

**Threat.** `package.json` uses `^` semver on the wallet adapter and
metaplex packages — any minor/patch update on next install lands. With
`next.config.js` setting `ignoreBuildErrors: true` and ESLint
`ignoreDuringBuilds: true`, a malicious post-install script that mutates
the bundled treasury pubkey would never trip a typecheck.

**Mitigation today.** Documented; the npm `prebuild` step should run
`npm audit --audit-level=high` and the wallet-adapter family should pin
with `~` (patch only, no minor) before mainnet. We accept the current
risk because we are not yet on mainnet and `package-lock.json` is
checked into git, locking transitive resolutions.

---

## §H — Operator checklist before any mainnet deploy

- [ ] `NEXT_PUBLIC_ADMIN_WALLETS` set to the production multisig pubkey list
- [ ] `NEXT_PUBLIC_SIGHT_TREASURY` matches the multisig treasury vault
- [ ] `NEXT_PUBLIC_SIGHT_RPC` is a domain-restricted Helius/Alchemy URL
- [ ] `db/schema.sql` applied to a Supabase project with Auth bound to wallet sign-in
- [ ] `clawglasses_nft` Anchor program deployed; `verifyCollection` shipping in mint tx
- [ ] `treasury-pin.ts` hard-codes the canonical treasury pubkey
- [ ] `npm audit --audit-level=high` is green
- [ ] `bash scripts/check-no-simulated-leak.sh` is green against the production bundle
- [ ] Origin allowlist in `WalletProviders` is wired
- [ ] This file is read top-to-bottom and signed off by Howard

---

## How to extend this file

When a new finding lands (red team, bug bounty, internal review), add a
new lettered section. Status per finding is one of:
- **CRITICAL → patched** — fix in current commit, see references
- **HIGH → mitigated** — partial fix, residual risk documented
- **HIGH → architectural** — requires future phase, accepted
- **MEDIUM/LOW** — tracked, not yet fixed

The bar is: a future engineer reading only this file can understand both
what we believe is safe AND why.
