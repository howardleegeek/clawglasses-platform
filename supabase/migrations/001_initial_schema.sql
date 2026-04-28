-- ═══════════════════════════════════════════════════════════
-- Clawglasses — Initial Database Schema
-- ═══════════════════════════════════════════════════════════

-- ── Enums ─────────────────────────────────────────────────
CREATE TYPE node_status AS ENUM ('live', 'offline');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');

-- ── Nodes ─────────────────────────────────────────────────
CREATE TABLE nodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet  TEXT NOT NULL,
  device_model  TEXT NOT NULL CHECK (device_model IN ('WG1', 'WG2')),
  onchain_pda   TEXT,                           -- Anchor PDA address
  status        node_status NOT NULL DEFAULT 'offline',
  total_slots   SMALLINT NOT NULL DEFAULT 20,
  used_slots    SMALLINT NOT NULL DEFAULT 0,
  simulated_slots SMALLINT NOT NULL DEFAULT 0,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nodes_owner ON nodes (owner_wallet);
CREATE INDEX idx_nodes_status ON nodes (status);

-- ── NFT Passes ────────────────────────────────────────────
CREATE TABLE nft_passes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet  TEXT NOT NULL,
  mint_index    INTEGER NOT NULL UNIQUE,
  onchain_pda   TEXT,
  tier          SMALLINT NOT NULL DEFAULT 1,
  mint_price    NUMERIC(18, 9) NOT NULL,        -- $SIGHT (9 decimals)
  tx_signature  TEXT,
  minted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  staked_on     UUID REFERENCES nodes(id),
  is_staked     BOOLEAN NOT NULL DEFAULT false,
  is_simulated  BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nft_owner ON nft_passes (owner_wallet);
CREATE INDEX idx_nft_staked ON nft_passes (is_staked) WHERE is_staked = true;
CREATE INDEX idx_nft_expires ON nft_passes (expires_at);

-- ── Hardware Orders ───────────────────────────────────────
CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_wallet  TEXT NOT NULL,
  product_key   TEXT NOT NULL CHECK (product_key IN ('WG1', 'WG2')),
  price         NUMERIC(12, 2) NOT NULL,
  pay_token     TEXT NOT NULL CHECK (pay_token IN ('USDC', 'USDT')),
  tx_signature  TEXT,
  shipping_name TEXT,
  shipping_email TEXT,
  shipping_address TEXT,
  status        order_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_buyer ON orders (buyer_wallet);

-- ── Reward Pool ───────────────────────────────────────────
CREATE TABLE reward_pool (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_balance NUMERIC(18, 9) NOT NULL DEFAULT 0,
  last_distribution TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert single-row pool tracker
INSERT INTO reward_pool (total_balance) VALUES (0);

-- ── Reward Distributions (log) ────────────────────────────
CREATE TABLE reward_distributions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_distributed NUMERIC(18, 9) NOT NULL,
  num_recipients INTEGER NOT NULL,
  per_nft_amount NUMERIC(18, 9) NOT NULL,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Individual Reward Claims ──────────────────────────────
CREATE TABLE reward_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID NOT NULL REFERENCES reward_distributions(id),
  nft_pass_id   UUID NOT NULL REFERENCES nft_passes(id),
  wallet        TEXT NOT NULL,
  amount        NUMERIC(18, 9) NOT NULL,
  is_simulated  BOOLEAN NOT NULL DEFAULT false,  -- simulated → treasury
  tx_signature  TEXT,
  claimed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_wallet ON reward_claims (wallet);
CREATE INDEX idx_claims_distribution ON reward_claims (distribution_id);

-- ── Auto-update timestamps ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nodes_updated BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_nft_updated BEFORE UPDATE ON nft_passes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pool_updated BEFORE UPDATE ON reward_pool
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Views ─────────────────────────────────────────────────

-- Network stats (used by frontend dashboard)
CREATE OR REPLACE VIEW v_network_stats AS
SELECT
  (SELECT COUNT(*) FROM nodes WHERE status = 'live') AS nodes_online,
  (SELECT SUM(total_slots) FROM nodes WHERE status = 'live') AS total_slots,
  (SELECT SUM(used_slots) FROM nodes WHERE status = 'live') AS used_slots,
  (SELECT SUM(simulated_slots) FROM nodes WHERE status = 'live') AS simulated_slots,
  (SELECT COUNT(*) FROM nft_passes) AS total_nfts,
  (SELECT COUNT(*) FROM nft_passes WHERE is_staked = true) AS staked_nfts,
  (SELECT total_balance FROM reward_pool LIMIT 1) AS reward_pool_balance,
  CASE
    WHEN (SELECT SUM(total_slots) FROM nodes WHERE status = 'live') > 0
    THEN (SELECT COUNT(*)::NUMERIC FROM nft_passes) /
         (SELECT SUM(total_slots)::NUMERIC FROM nodes WHERE status = 'live')
    ELSE 0
  END AS nft_slot_ratio;

-- ── Row-Level Security ────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

-- Public read for nodes and nft_passes (network transparency)
CREATE POLICY "Public read nodes" ON nodes FOR SELECT USING (true);
CREATE POLICY "Public read nft_passes" ON nft_passes FOR SELECT USING (true);

-- Orders: only the buyer can see their own orders
CREATE POLICY "Buyer reads own orders" ON orders
  FOR SELECT USING (buyer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet');

-- Claims: only the wallet owner can see their claims
CREATE POLICY "Owner reads own claims" ON reward_claims
  FOR SELECT USING (wallet = current_setting('request.jwt.claims', true)::json->>'wallet');

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service full access nodes" ON nodes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access nft_passes" ON nft_passes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access claims" ON reward_claims FOR ALL USING (true) WITH CHECK (true);
