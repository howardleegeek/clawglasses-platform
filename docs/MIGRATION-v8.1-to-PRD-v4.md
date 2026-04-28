# Migration — v8.1 economy → PRD v4

**Authority:** `/Users/howardli/Downloads/Clawglasses_PRD_v4.md` (2026-04-25, "Final pre-dev spec")
**Status:** Phase 1 complete — structural compliance, v0.3.0 polish preserved.

---

## Why we migrated

v8.1 was a closed-form 4h emission schedule with 10 fixed mint tiers and a 21-day on-stake lifetime. PRD v4 reframes the economy as a **fee-funded "musical chairs"** game: NFT mint fees and trading royalties are the only inflow, split 60/40 between a reward pool and treasury. There is no inflationary $SIGHT printing.

The PRD's `is_simulated` stake mechanic, configurable expiry, and bonding-curve pricing all flow from this core: as long as Active NFTs > Total Slots, the system is profitable. Hardcoded tiers and rarities couldn't model that.

---

## Diff at a glance

| Concern | v8.1 (before) | PRD v4 (now) |
|---|---|---|
| Mint pricing | 10 fixed tiers (T1=100 → T10=1550 $SIGHT) | Bonding curve `base + increment × total_minted` |
| NFT lifetime | 21d / 30d / 45d by rarity | Single `nft_expiry_days` (default 30, configurable) |
| Reward source | Closed-form 4h emission ledger | Reward pool funded by mint fees + royalties (60% pool / 40% treasury) |
| Reward split per stake | 5% per license, 3% wearer / 2% holder | Per-node `rev_share_node_pct`, remainder split per staker |
| Simulated activity | Not modelled | `is_simulated` stakes, type-isolated from public |
| Admin levers | None in code | 6-panel `/admin` dashboard |
| Source of truth | Scattered constants | `lib/sight/config/economic.ts` single module |

---

## Files touched

| File | Action | Notes |
|---|---|---|
| `lib/sight/config/economic.ts` | NEW | Typed `EconomicConfig` + `DEFAULT_CONFIG` + `loadConfig()`. Mirrors PRD §8 `admin_config` keys exactly. |
| `lib/sight/mint/pricing.ts` | UPDATED | `currentPrice(totalMinted)` is now canonical. `TIER_TABLE` + `tierForAlive` retained as `@deprecated` for the `/sight/tokenomics` archive. |
| `lib/sight/mint/lifecycle.ts` | UPDATED | `expiryDaysFromConfig()` is canonical. `COMMON_LIFETIME_DAYS` etc. retained as `@deprecated`. |
| `lib/sight/mint/types.ts` | EXTENDED | New: `Stake` (public-safe), `AdminStake` (admin-only with `is_simulated`), `Node`, `Order`, `RewardPool`, `MiningLogEntry`, `RatioReading`. |
| `db/schema.sql` | NEW | All 7 PRD §8 tables, indexes, RLS policies, seed `admin_config` rows. Idempotent. |
| `app/admin/page.tsx` | NEW | Wallet-gated dashboard. Six panels (A–F) per PRD §7.5. Mock data in this phase. |
| `app/sight/*` | UNCHANGED | All v0.3.0 polish preserved. Marketing surface stays. |

---

## The trap we did NOT walk into

PRD §4 demands that simulated stakes be indistinguishable from real ones on public surfaces. The temptation is to put `is_simulated: boolean` on a single `Stake` type and hope developers remember not to render it.

We did not. There are **two separate types**:

```ts
// lib/sight/mint/types.ts

export type Stake = {           // public-safe — node browser, staker inventory
  id: string;
  node_id: string;
  staker_wallet: string;
  /* … no is_simulated … */
};

export type AdminStake = Stake & {   // admin-only — admin dashboard, mining cron
  is_simulated: boolean;
};
```

The Supabase RLS policy enforces the same boundary at the database layer (`stakes` table is RLS-protected; public reads go through a `SECURITY DEFINER` view that strips `is_simulated`). Belt-and-suspenders on the failure mode that ends the company.

---

## What's still ahead (PRD phases 2–7)

This commit is **Phase 1 — structural compliance**. The site builds, deploys, and reads PRD-shaped types. Subsequent phases:

| Phase | Work | Trigger |
|---|---|---|
| 2 | Provision Supabase, run `db/schema.sql`, wire `loadConfig()` to read `admin_config` row | Howard provisions Supabase project |
| 3 | Anchor program `clawglasses_nft` (initialize / mint_nft / update_pricing / update_expiry / update_fee_split) | Devnet test wallet ready |
| 4 | Anchor program `clawglasses_staking` (create_node / stake_nft / unstake_nft / claim_rewards) | After phase 3 |
| 5 | Replace mock data in `/admin` panels with live Supabase queries | After phase 2 |
| 6 | Hourly cron Edge Function for `mining_log` distributions per PRD §10 | After phase 4 |
| 7 | `/purchase` USDC/USDT SPL transfer flow per PRD §7.2 | Treasury wallet decided |

Today's commit unblocks every one of those by giving them a typed, build-green target to hit.

---

## How to operate the new admin

1. Connect a Solana wallet whose pubkey is in `NEXT_PUBLIC_ADMIN_WALLETS` (comma-separated env var). With the var unset, *any* connected wallet sees the dashboard — useful for local dev, dangerous in prod. Set it.
2. Visit `/admin`.
3. Scroll the six panels via the sticky sidebar. Edits in this Phase-1 build are visual stubs only — they do not persist.

---

## Build verification

```bash
cd /Users/howardli/Downloads/clawglasses-website
npx next build
```

Exits 0 with all routes static, including the new `/admin`. v0.3.0 routes unchanged.
