-- ═══════════════════════════════════════════════════════════
-- 002 — Lock admin-only columns from anon-key reads
--
-- BACKGROUND: 001_initial_schema.sql exposed `simulated_slots` directly
-- in `v_network_stats` (line 126) and applied `USING (true)` policies
-- on `nodes` and `nft_passes` (lines 145-146). Combined with the
-- bundled NEXT_PUBLIC_SUPABASE_ANON_KEY, anyone with one curl can
-- read the simulated-stake counts and post a "this network is mostly
-- fake" thread.
--
-- This migration:
--   1. Replaces the public view with a clean projection (no simulated_slots).
--   2. Drops permissive `USING (true)` policies; replaces with column-
--      restricted policies via a SECURITY DEFINER public-projection view.
--   3. Revokes anon-role direct SELECT on raw tables; anon reads only
--      the public views.
--   4. Service role keeps full access for Edge Functions.
-- ═══════════════════════════════════════════════════════════

-- 1. Replace the leaky view with a public-safe projection.
DROP VIEW IF EXISTS v_network_stats CASCADE;

CREATE OR REPLACE VIEW v_network_stats AS
SELECT
  (SELECT COUNT(*) FROM nodes WHERE status = 'live') AS nodes_online,
  (SELECT SUM(total_slots) FROM nodes WHERE status = 'live') AS total_slots,
  (SELECT SUM(used_slots) FROM nodes WHERE status = 'live') AS used_slots,
  (SELECT COUNT(*) FROM nft_passes) AS total_nfts,
  (SELECT COUNT(*) FROM nft_passes WHERE is_staked = true) AS staked_nfts,
  (SELECT total_balance FROM reward_pool LIMIT 1) AS reward_pool_balance,
  CASE
    WHEN (SELECT SUM(total_slots) FROM nodes WHERE status = 'live') > 0
    THEN (SELECT COUNT(*)::NUMERIC FROM nft_passes) /
         (SELECT SUM(total_slots)::NUMERIC FROM nodes WHERE status = 'live')
    ELSE 0
  END AS nft_slot_ratio;

-- 2. Public-safe nodes view — projects only public columns.
CREATE OR REPLACE VIEW v_nodes_public AS
SELECT
  id,
  owner_wallet,
  device_model,
  onchain_pda,
  status,
  total_slots,
  used_slots,
  registered_at,
  updated_at
FROM nodes
WHERE status = 'live';

-- 3. Public-safe nft_passes view — projects only public columns.
CREATE OR REPLACE VIEW v_nft_passes_public AS
SELECT
  id,
  owner_wallet,
  mint_index,
  onchain_pda,
  tier,
  mint_price,
  tx_signature,
  minted_at,
  expires_at,
  staked_on,
  is_staked,
  updated_at
FROM nft_passes;

-- 4. Drop the permissive policies from 001.
DROP POLICY IF EXISTS "Public read nodes" ON nodes;
DROP POLICY IF EXISTS "Public read nft_passes" ON nft_passes;

-- 5. Revoke anon SELECT on raw tables; anon reads only the public views.
REVOKE SELECT ON nodes FROM anon;
REVOKE SELECT ON nft_passes FROM anon;

-- Anon can only read the safe views.
GRANT SELECT ON v_network_stats TO anon;
GRANT SELECT ON v_nodes_public TO anon;
GRANT SELECT ON v_nft_passes_public TO anon;

-- Service role keeps full access (Edge Functions need raw columns).
GRANT ALL ON nodes TO service_role;
GRANT ALL ON nft_passes TO service_role;

-- 6. Optional: comment the columns so future schema readers see the
--    invariant in psql \d output.
COMMENT ON COLUMN nodes.simulated_slots IS
  'ADMIN-ONLY. Never exposed to anon. PRD §4 invariant.';
COMMENT ON COLUMN nft_passes.is_simulated IS
  'ADMIN-ONLY. Never exposed to anon. PRD §4 invariant.';
