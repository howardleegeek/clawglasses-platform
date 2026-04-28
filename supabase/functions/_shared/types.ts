/**
 * Database row types — mirrors `supabase/migrations/001_initial_schema.sql`.
 * Keep in sync when migrations change.
 */

export interface NftPassRow {
  id: string;
  owner_wallet: string;
  mint_index: number;
  onchain_pda: string | null;
  tier: number;
  mint_price: number;
  tx_signature: string | null;
  minted_at: string;
  expires_at: string;
  staked_on: string | null;
  is_staked: boolean;
  is_simulated: boolean;
  updated_at: string;
}

export interface NodeRow {
  id: string;
  owner_wallet: string;
  device_model: "WG1" | "WG2";
  onchain_pda: string | null;
  status: "live" | "offline";
  total_slots: number;
  used_slots: number;
  simulated_slots: number;
  registered_at: string;
  updated_at: string;
}

export interface RewardPoolRow {
  id: string;
  total_balance: number;
  last_distribution: string | null;
  updated_at: string;
}

export interface RewardDistributionRow {
  id: string;
  total_distributed: number;
  num_recipients: number;
  per_nft_amount: number;
  distributed_at: string;
}

export interface RewardClaimInsert {
  distribution_id: string;
  nft_pass_id: string;
  wallet: string;
  amount: number;
  is_simulated: boolean;
}

// ── Public response shapes (NEVER include `is_simulated`) ──────────────
export type DistributeRewardsResponse =
  | { status: "ok"; distributed: number; recipients: number; per_nft: number }
  | { status: "skip"; reason: string }
  | { error: string };

export type SyncChainResponse =
  | { status: "ok"; expired_nfts: number; synced_accounts: number; timestamp: string }
  | { error: string };
