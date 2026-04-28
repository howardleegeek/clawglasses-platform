# GAPS — Ship-Today Triage (PRD v4 vs kai68 vs current)

> Howard: 我有点急 今天要上线 你有什么拌饭 看看我们的gap在哪
>
> Triage: **what blocks today's ship**, what is **alpha-OK with disclaimer**, and
> what can be **Phase 2 (post-launch)**. Read top to bottom; act on BLOCKERs only.

**TL;DR**: Anchor program **is not deployed on mainnet**. Therefore the only
same-day attack surface is **public Supabase reads** + **frontend honesty**.
Both are now patched. Ship as **Closed alpha · 演示阶段** with the banner
visible everywhere. Treasury, on-chain payouts, and "musical chairs" framing
gate the **mainnet** launch — not today's preview launch.

---

## Block status (decide-in-30-seconds)

| Status | What it means |
|---|---|
| 🚨 **BLOCKER** | Must be merged + deployed before the alpha URL is shared publicly. |
| ⚠️ **ALPHA-OK** | Wrong vs PRD, but acceptable under the "Closed alpha · numbers are demonstrative" banner. Track in Phase 2. |
| 📋 **PHASE-2** | Required before anyone sends real money. Not blocking a preview/demo URL. |

---

## 1. Same-day blockers (already patched in this branch)

| # | Risk | PRD ref | Source | Status |
|---|---|---|---|---|
| 1 | Public anon-key leaked `simulated_slots` via `v_network_stats` view + raw `nodes` / `nft_passes` reads (`USING (true)` policies). One curl from anyone with the bundled `NEXT_PUBLIC_SUPABASE_ANON_KEY` and they get a "this network is mostly fake" thread. | §4 invariant — admin-only columns | kai68 base (`001_initial_schema.sql` lines 126, 145, 146) | 🚨 → ✅ patched in `supabase/migrations/002_lock_admin_columns.sql` |
| 2 | Frontend never told the visitor that prices/counts are demonstrative — looks like production. | PRD honesty norm | ours | 🚨 → ✅ patched in `src/app/layout.tsx` (amber banner site-wide) |
| 3 | Build did not enforce the no-leak invariant. A future GLM agent could re-add `simulated_slots` to a public type and we wouldn't notice. | §4 invariant | ours | 🚨 → ✅ patched: `pnpm prebuild` now runs `scripts/check-no-simulated-leak.sh` |
| 4 | `src/lib/supabase/api.ts` queried raw tables and returned an admin column on the public type. | §4 invariant | ours | 🚨 → ✅ patched: switched to `v_nodes_public` / `v_nft_passes_public`; removed `simulated_slots` / `is_simulated` from public row types |

**Combined effect**: an anon visitor can now only see counts that match the
public PRD §3 view (nodes online, slots in use, NFT/slot ratio). The simulated
side of bootstrap is invisible to anyone without the service role key.

---

## 2. Real PRD gaps (NOT blocking today's preview, but you should know)

### 2a. On-chain layer — not deployed at all

| PRD § | What PRD says | kai68 delivered | Current state | Blocking today? |
|---|---|---|---|---|
| §1.1 token | `$SIGHT` Token-2022, 10B supply, mint/freeze revoked, LP locked 12mo Streamflow | not in repo | not in repo | ⚠️ ALPHA-OK — banner says "On-chain program not yet deployed" |
| §1.2 NFT pass | Metaplex Core collection, Royalties 6% → buyback, Attribute (tier/rarity), 30-day pass | `anchor/programs/clawglasses/src/lib.rs` (5-tier bonding curve, NFT pass) — compiles, **not deployed** | unbuilt + not deployed | ⚠️ ALPHA-OK |
| §3 musical chairs | 60% pool / 40% treasury split via on-chain hourly cron | `anchor/programs/.../lib.rs` references but no payout instruction wired | no claim instruction; `HOURLY_PAYOUT_RATE` hard-coded constant (Blue's finding) | ⚠️ ALPHA-OK |
| §5 NFT/slot gauge zones | Health bands 1.0 / 1.3 / 1.8 / 2.0 | partially in api.ts: `<1.3 = low`, `>1.8 = high`, else healthy | matches PRD | ✅ |
| T3 reconciliation | Off-chain DB must reconcile with on-chain truth on each payout | not implemented | not implemented | 📋 PHASE-2 — only matters once Anchor is deployed |
| T4 ATA constraint | Recipient must hold a non-expired NFT pass ATA at payout time | not implemented | not implemented | 📋 PHASE-2 — same as T3 |

### 2b. Backend layer — partial vs PRD

| PRD § | What PRD says | kai68 delivered | Current state | Blocking today? |
|---|---|---|---|---|
| §6 epochs | 4h epoch tick → distribute pool → record `epoch_rewards` per wallet | not in kai68 | not in repo (the StepN-style mining_engine + epoch_scheduler from `oyster/specs/sight-token-phase0/` is a **separate** Lane B project, unrelated to this repo) | ⚠️ ALPHA-OK — banner is honest about "no real value moves" |
| §6 reward claim | Wallet calls `/claim` → backend signs SPL transfer → tx hash returned | not implemented | mock-data path only | ⚠️ ALPHA-OK |
| §7 simulated slot admin | Admin UI behind service-role auth to add/remove simulated stakes | `src/app/admin/` shell exists | ✅ env-flagged route gate: returns 404 unless `NEXT_PUBLIC_ADMIN_ENABLED=true` is set on the deploy. Phase-2: replace with wallet-sig auth. | ⚠️ ALPHA-OK — gate is silent (404, not 401) so route existence isn't leaked |
| §8 Mint flow | Wallet → bonding curve price → SPL pay → NFT mint via Candy Machine v3 | UI + signature flow scaffolded | mock-data path only | ⚠️ ALPHA-OK |
| §9 staking | Stake NFT to a node, 12h cooldown to unstake, capped at 20/node | UI scaffolded | mock-data path only | ⚠️ ALPHA-OK |

### 2c. Frontend layer — pages present, behavior demo-only

| Route | PRD coverage | kai68 delivered | Current state |
|---|---|---|---|
| `/` | landing + value prop | ✅ landing | ✅ rendering |
| `/mint` | bonding curve + connect → buy | ✅ scaffolded | ✅ scaffolded (demo) |
| `/nodes` | live node list + slot gauge | ✅ scaffolded | ✅ scaffolded (uses `v_nodes_public` after patch) |
| `/purchase` | buy hardware (USDC/USDT) | ✅ scaffolded | ✅ scaffolded |
| `/admin` | service-role gated admin tools | shell only | shell only (auth gate not verified) |
| `/sight` | tokenomics page (PRD v4 §1-6 tables) | partial | partial — tier table not yet rendered with v4 numbers |

---

## 3. Cross-repo confusion warning (read once, don't act on it today)

The plan file `~/Downloads/plans/eventual-wibbling-codd.md` describes a
**StepN-style $SIGHT mining engine** as Lane B in `oyster/products/clawglasses/backend/`
— that is a **different repo** than this one (`clawglasses-website`).
Today's ship is the **website / wallet UX / public Supabase**. The Lane B
backend (Alembic migration 0009, mining_engine, epoch_scheduler) is a separate
project that gates Phase 1 (T+3-7d) when glasses ship and T1 mint opens.

**Do not** try to merge those two trees today. Keep this repo as the marketing
+ public-read surface; let the oyster monorepo own the StepN engine.

---

## 4. Convergent Red+Blue findings (independent reviewers agreed)

| Finding | Severity | Patched? |
|---|---|---|
| Public anon-key reads admin columns | BROKEN | ✅ migration 002 |
| 60/40 pool/treasury split exists in spec but is not enforced anywhere on-chain | BROKEN | 📋 PHASE-2 (Anchor not deployed → not exploitable today) |
| "Musical chairs" framing is one bad-press cycle from being labeled a Ponzi by a journalist | NARRATIVE | ⚠️ ALPHA-OK with banner; rewrite framing before mainnet |
| `HOURLY_PAYOUT_RATE` is a hard-coded constant, not a function of on-chain state | LOGIC | 📋 PHASE-2 |
| No `$SIGHT` genesis script in repo — token mint procedure undocumented | OPS | 📋 PHASE-2 (Howard owns this in Lane A) |
| No `claim` instruction in Anchor | LOGIC | 📋 PHASE-2 |

---

## 5. Action items in priority order

### Now (next 5 minutes — already in motion)
1. Commit the 4 patches on `public-main` and push to `platform` remote.
2. Trigger Vercel preview deploy.
3. Smoke-test the public anon path (curl). _Conditional: requires `SUPABASE_URL` + `SUPABASE_ANON_KEY` env — if not on this machine, skip and verify post-deploy._
4. Confirm the alpha banner is visible on the production URL.

### Before sharing the URL widely (next 30 minutes)
5. ✅ `/admin` is now env-gated. Returns 404 unless deploy sets `NEXT_PUBLIC_ADMIN_ENABLED=true`. To re-enable for an authorized dev preview: add the env var on the Vercel project (or in `.env.local` for local).
6. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the deployed env is the **anon** key, not the **service role** key (a bundled service-role key would defeat all of this). Howard owns this — check Vercel project Settings → Environment Variables.
7. Confirm the 4 admin columns we revoked are still readable via the service-role key from the admin shell — i.e. we locked down anon, not ourselves. Smoke-test: with `NEXT_PUBLIC_ADMIN_ENABLED=true` and a service-role client, `fetchAdminNodes()` should return rows including `simulated_slots`.

### Before mainnet / "real money" launch (Phase 2)
8. Deploy Anchor program → add `claim` instruction → add T3 reconciliation worker → add T4 ATA check.
9. Replace "musical chairs" framing in `/sight` and any tweet copy.
10. Land Lane B (oyster monorepo) StepN mining_engine + epoch_scheduler.
11. LP lock + Streamflow + revoke mint/freeze + Jupiter Verified.
12. Run a real adversarial review against the live Anchor program.

---

## 6. Suggested public framing for today's launch

> "Clawglasses · **Closed alpha**. We're previewing the network UX with
> demonstrative numbers. Token, NFTs, and on-chain payouts are not yet live —
> no real value moves on this preview. Sign up for waitlist to be notified
> when alpha → mainnet."

That sentence is the load-bearing one. The banner in `src/app/layout.tsx` is
the in-product version of it — every page already shows it.

---

## 7. What this triage explicitly does NOT cover

- The Lane A token creation in Howard's wallet (Squads / Streamflow / Jupiter Verified).
- The Lane B oyster monorepo backend (Alembic 0009, mining_engine, epoch_scheduler).
- Lane D Metaplex Core collection deploy.
- Trends partnership content / PR timing.
- Magic Eden royalty buyback bot.

Those are tracked in `~/Downloads/plans/eventual-wibbling-codd.md` (StepN-style
plan) and `~/Downloads/oyster/specs/claw-token/`. Today's ship is the
**website**.
