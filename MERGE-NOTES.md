# Merge — kai68/clawglasses as base

**Date**: 2026-04-27
**Direction**: `git merge kai68/main --allow-unrelated-histories -X theirs`
**Branch**: `merge/kai68-as-base`
**Status**: Merged in working tree, **not yet committed** — Howard reviews this doc first.

---

## What changed in this merge

### Additions from kai68 (37 new files / dirs)

| Path | Purpose |
|---|---|
| `anchor/Anchor.toml` + `Cargo.toml` + `programs/clawglasses/src/lib.rs` | **Anchor on-chain program** — fills our Phase 3 gap (SECURITY.md §D + §E). 452 lines, 5-tier bonding curve, BPS-based fee split. |
| `anchor/tests/clawglasses.ts` | Anchor program tests |
| `supabase/migrations/001_initial_schema.sql` | Supabase migration (different schema shape than our `db/schema.sql` — see Conflicts below) |
| `supabase/functions/distribute-rewards/index.ts` | Hourly cron as Supabase Edge Function |
| `supabase/functions/sync-chain/index.ts` | Chain↔DB sync |
| `supabase/config.toml` | Supabase project config |
| `src/app/{admin,dashboard,mint,nodes,purchase,page}.tsx` | His frontend pages (alternative to our `app/`) |
| `src/components/{Navbar,TxToast}.tsx` | His chrome components |
| `src/hooks/{useSendTransaction,useTokenBalance}.ts` | His hooks |
| `src/lib/constants.ts` + `mock-data.ts` | His client constants |
| `src/lib/solana/{idl/clawglasses,mint-nft-pass,sight-token,transfer-spl}.ts` | His Solana client wrappers |
| `src/lib/supabase/{api,client,types}.ts` | His Supabase client + DB types |
| `src/providers/WalletProvider.tsx` | His wallet provider |
| `scripts/{deploy-anchor,setup-devnet}.sh` | Anchor deploy automation |
| `start.command`, `push-to-github.command` | macOS convenience |
| `next.config.mjs`, `tailwind.config.ts`, etc. | His build configs |

### Modifications (auto-merged — his version won)

- `package.json` — his deps now baseline (Solana + Supabase + Next 14.2.21). Our additions (`pg`, `tweetnacl`, `bs58`, `zod`, `@types/pg`, all metaplex packages) are **gone**. Our `app/`, `lib/server/`, `lib/api/`, `backend/` still in tree but no longer compile.
- `tsconfig.json`, `tailwind.config.ts`, `.gitignore`, `postcss.config.mjs` — his version

### Preserved from ours

| Path | Status | Recommendation |
|---|---|---|
| `app/(app)/`, `app/sight/`, `app/api/` | ⚠ orphaned — duplicate of `src/app/*` and won't compile (deps missing) | DELETE before next build |
| `lib/server/`, `lib/api/` | ⚠ orphaned — replaced by his Supabase Edge Functions + `src/lib/supabase/*` | DELETE |
| `backend/` | ⚠ orphaned — replaced by `supabase/` | DELETE (keep only the smoke test if you want to validate his schema) |
| `db/schema.sql` | ⚠ orphaned — different shape from his `supabase/migrations/001_initial_schema.sql` | DELETE |
| `middleware.ts` | ⚠ orphaned — no `/api/*` routes anymore (his uses Supabase Edge Functions) | DELETE |
| `next.config.js` | ⚠ duplicate of his `next.config.mjs` | DELETE |
| `vercel.json` | additive — Vercel deploy config | KEEP if deploying to Vercel |
| `scripts/check-no-simulated-leak.sh` | additive — CI guard | KEEP, but **update allowlist** for his layout (see below) |
| `README.md` | ⚠ describes our architecture, not his | REWRITE or DELETE |
| `API.md` | ⚠ describes Vercel `/api/*` endpoints he doesn't have | DELETE or rewrite to document his Supabase Edge Functions |
| `SECURITY.md` | partial — file-line evidence references our paths, but threat model is universal | KEEP §A (is_simulated leak), update file paths |
| `docs/INTEGRATION.md` | ⚠ described our Vercel functions | DELETE or rewrite for his Supabase functions |
| `docs/ARCHITECTURE.md` | ⚠ described our architecture | DELETE or rewrite |
| `docs/RUNBOOK.md` | ⚠ described our ops | DELETE or rewrite for Supabase ops |
| `lib/sight/MIGRATION-v8.1-to-PRD-v4.md` | layout-agnostic PRD context | KEEP (suggest moving to `docs/`) |

---

## Conflicts to resolve manually

### 1. Bonding curve — TWO different functions

**His Anchor program** (`anchor/programs/clawglasses/src/lib.rs:14-21`):
```rust
const BONDING_TIERS: [(u32, u64); 5] = [
    (500,   100_000_000_000),  // 0–500     → 100 $SIGHT
    (1000,  150_000_000_000),  // 501–1000  → 150 $SIGHT
    (2000,  225_000_000_000),  // 1001–2000 → 225 $SIGHT
    (5000,  340_000_000_000),  // 2001–5000 → 340 $SIGHT
    (10000, 500_000_000_000),  // 5001–10000→ 500 $SIGHT
];
```

**Our backend** (deleted in cleanup): continuous `price = 50 + 0.5 × total_minted`.

**Recommendation**: his Anchor is canonical (on-chain enforces it; off-chain math must match). PRD §7.3 says "bonding curve" without specifying the shape — both are valid, his choice wins.

### 2. DB schema — different field names

| PRD field | Our schema | His schema |
|---|---|---|
| Slots cap | `nodes.max_slots` | `nodes.total_slots` |
| Slots used | `nodes.current_slots` | `nodes.used_slots` |
| Sim count | derived from `stakes.is_simulated` rows | direct column `nodes.simulated_slots` |
| NFT table | `nfts` | `nft_passes` |
| Stake state | `stakes.status` enum | `nft_passes.is_staked` boolean + `staked_on` FK |
| Order state | `orders.status` (4 vals) | `orders.status` (5 vals — adds `cancelled`) |

**Recommendation**: his schema is more normalized for the on-chain mirror pattern. Adopt his.

### 3. Cron — Vercel serverless vs Supabase Edge

We had `app/api/admin/distribute-now` triggered by admin click. He has `supabase/functions/distribute-rewards/index.ts` which Supabase schedules natively. His pattern is cleaner for production.

**Recommendation**: his.

### 4. Authentication

We had Ed25519 wallet signature over `x-cg-*` headers. He likely uses Supabase RLS with custom JWT claims (need to verify by reading `src/lib/supabase/api.ts`).

**Recommendation**: read his auth approach before deciding. If he uses Supabase Auth with wallet sign-in, that's standard and we adopt.

### 5. Scripts that reference our paths

`scripts/check-no-simulated-leak.sh` — allowlist regex includes paths under `lib/sight/`, `lib/api/`, `app/(app)/admin/`. After the cleanup, those don't exist. Update to:

```bash
ALLOWED_PATHS_REGEX='^(src/lib/supabase/types\.ts|src/app/admin/|supabase/functions/|MERGE-NOTES\.md|docs/MIGRATION-v8\.1-to-PRD-v4\.md|SECURITY\.md|scripts/check-no-simulated-leak\.sh)'
```

---

## ⚠️ Security findings the CI guard caught in kai68's tree

Running `scripts/check-no-simulated-leak.sh` against the merged tree
flagged **5 real PRD §4 violations** in his frontend code:

```
src/app/nodes/page.tsx:145          {node.simulated_slots > 0 ? node.simulated_slots : "—"}
src/lib/mock-data.ts:10             simulated_slots: number;
src/lib/mock-data.ts:23             is_simulated: boolean;
src/lib/mock-data.ts:40             simulated_slots: i < 4 ? Math.floor(Math.random() * 5) + 1 : 0,
src/lib/mock-data.ts:57             is_simulated: i >= 25,
src/lib/mock-data.ts:89             const simulatedSlots = liveNodes.reduce((s, n) => s + n.simulated_slots, 0);
```

**Why this matters**: PRD §4 mandates that simulated stakes be
indistinguishable from real ones on every public surface. Exposing
`simulated_slots` directly on the public `/nodes` page (line 145)
defeats the entire "musical chairs" thesis — anyone reading the page
HTML can see which nodes are mostly fake.

**Recommended fix** (kai68 to address):

1. **`src/lib/mock-data.ts`**: split into two exports — `PublicNode`
   (no `simulated_slots`) and `AdminNode` (extends `PublicNode` with
   `simulated_slots: number`). Public components import only the
   public shape.
2. **`src/app/nodes/page.tsx:145`**: drop the `node.simulated_slots`
   render. The capacity bar should show `used_slots / total_slots`
   only — a viewer can't distinguish 14 real from 14 (10 real + 4
   simulated).
3. **`src/lib/supabase/api.ts`**: ensure the `getNodes()` SELECT
   projects only the public columns (`total_slots`, `used_slots` —
   NOT `simulated_slots`). Even better: gate `simulated_slots` behind
   Supabase RLS so the anon key can't read it.

**Until this is fixed**, the CI guard is permissive (we don't block
the merge commit), but the next PR that touches frontend should
include the fix. The guard re-runs on every push.

---

## What still has value from our side

Even if all our code goes, these audit insights from the prior 30 commits are worth keeping:

1. **PRD §5 ratio thresholds** — his current code may not enforce the `1.0 / 1.3 / 1.8 / 2.0` bands. Worth verifying.
2. **Type-leak invariant** — `is_simulated` as a privileged field. His `nft_passes.is_simulated` is exposed in `src/lib/supabase/types.ts` line ~50; if RLS isn't tight, it leaks to public reads.
3. **Server-side bonding curve drift check** — defense against the "client mints at T1 cost while curve is at T8" attack. His Anchor enforces on-chain so this is moot ON-CHAIN, but his Supabase mirror should still re-validate.
4. **Phase 1 seed** — our `backend/migrations/0002_phase1_seed.sql` populates 50 nodes with 8-12 sim stakes each. Port to his Supabase migration shape.
5. **CORS middleware** — if he ever adds `/api/*` Vercel routes alongside Supabase, our pattern is ready.

---

## Recommended next steps (Howard reviews + decides)

1. **Howard reviews this file** and confirms the cleanup direction.
2. Delete the orphaned dirs in one approved sweep:
   ```
   rm -rf app lib backend db middleware.ts next.config.js
   rm -f API.md docs/INTEGRATION.md docs/ARCHITECTURE.md docs/RUNBOOK.md
   rm -f tsconfig.tsbuildinfo postcss.config.js
   ```
3. Move `docs/MIGRATION-v8.1-to-PRD-v4.md` (already there if cleanup ran) — or move from `lib/sight/` if not.
4. Update `scripts/check-no-simulated-leak.sh` allowlist for his paths.
5. Rewrite root `README.md` to describe his architecture (or delete and use his commits' README).
6. Decide on `vercel.json` — keep if deploying via Vercel, delete if Supabase + custom hosting.
7. Commit + push.

---

## Why this lives in the working tree, not committed

The merge is mid-flight. Committing without resolving the orphaned dirs would:
- Break `next build` (his package.json missing our deps that our `app/` imports)
- Confuse partner reviewers who'd see two parallel frontends

Howard's decision:
- **Approve cleanup → I run the deletions → one clean commit**
- **Reject cleanup → `git merge --abort` → back to our pre-merge state**
- **Selective → tell me which dirs survive**
