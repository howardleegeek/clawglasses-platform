# Clawglasses

AI smart glasses + earnings cards on Solana. Hardware buyers operate
nodes; card holders join nodes and earn $SIGHT every hour.

This repo is a merged tree:

- **Base**: `kai68/clawglasses` — frontend, Anchor program, Supabase
  schema + edge functions.
- **Layered on top**: PRD audit + threat model + CI guard from the
  `howardleegeek/clawglasses-website` work.

See [`MERGE-NOTES.md`](./MERGE-NOTES.md) for what was kept, what was
deleted, and the unresolved decisions to make.

---

## What's where

| Path | Purpose |
|---|---|
| `src/app/{admin,dashboard,mint,nodes,purchase,page}.tsx` | Frontend pages |
| `src/components/`, `src/hooks/`, `src/providers/` | UI + chrome |
| `src/lib/solana/*` | Solana client wrappers |
| `src/lib/supabase/*` | Supabase typed client + API |
| `anchor/programs/clawglasses/src/lib.rs` | On-chain Anchor program (5-tier bonding curve, 60/40 split, 30-day NFT pass) |
| `supabase/migrations/001_initial_schema.sql` | DB schema |
| `supabase/functions/distribute-rewards/` | Hourly cron Edge Function |
| `supabase/functions/sync-chain/` | Chain↔DB sync |
| `scripts/{deploy-anchor,setup-devnet}.sh` | Anchor deploy automation |
| `scripts/check-no-simulated-leak.sh` | CI guard — blocks `is_simulated` leak to non-admin code |
| `docs/MIGRATION-v8.1-to-PRD-v4.md` | Why the economics look the way they do |
| `SECURITY.md` | Threat model + accepted residual risk |
| `MERGE-NOTES.md` | This merge's reconciliation list |

---

## Local dev

```bash
# 1. Install
npm install

# 2. Solana / Anchor
bash scripts/setup-devnet.sh
bash scripts/deploy-anchor.sh

# 3. Supabase (local)
brew install supabase/tap/supabase  # if you don't have it
supabase start
supabase db push                    # applies migrations

# 4. Env
cp .env.example .env.local || true  # if .env.example exists
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.

# 5. Dev
npm run dev    # http://localhost:3000
```

---

## Deploy

- **Frontend** → Vercel (`vercel --prod`). Supabase + Anchor live elsewhere.
- **Database** → Supabase Cloud. Apply `supabase/migrations/*` via `supabase db push`.
- **Anchor program** → devnet first, then mainnet via `scripts/deploy-anchor.sh`.

---

## Status (post-merge, 2026-04-27)

| Area | Status |
|---|---|
| Frontend pages | ✅ from kai68 base |
| Anchor program (5-tier bonding curve) | ✅ from kai68 base |
| Supabase schema + Edge Functions | ✅ from kai68 base |
| `is_simulated` CI guard | ✅ from howardleegeek (allowlist updated for new layout) |
| PRD migration history | ✅ retained as `docs/MIGRATION-v8.1-to-PRD-v4.md` |
| SECURITY.md threat model | ⚠ retained but file:line evidence references old paths — needs update against new layout |
| MERGE-NOTES.md cleanup punchlist | ⚠ open — Howard reviews |

---

## License

Proprietary. Contact [howard.linra@gmail.com](mailto:howard.linra@gmail.com).
