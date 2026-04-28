// Mock data — replace with Supabase queries once backend is connected

export interface Node {
  id: string;
  device_model: "WG1" | "WG2";
  owner_wallet: string;
  status: "live" | "offline";
  total_slots: number;
  used_slots: number;
  simulated_slots: number; // slots occupied by simulated stakes
  registered_at: string;
}

export interface NFTPass {
  id: string;
  mint_address: string;
  owner_wallet: string;
  tier: number; // bonding curve tier
  mint_price_sight: number;
  minted_at: string;
  expires_at: string;
  staked_on_node: string | null;
  is_simulated: boolean;
}

export interface RewardPool {
  total_balance: number;
  hourly_payout: number;
  last_distribution: string;
}

// ── Mock Nodes ──
export const MOCK_NODES: Node[] = Array.from({ length: 12 }, (_, i) => ({
  id: `node-${String(i + 1).padStart(3, "0")}`,
  device_model: i % 3 === 0 ? "WG2" : "WG1",
  owner_wallet: `Wallet${String(i + 1).padStart(2, "0")}...${Math.random().toString(36).slice(2, 6)}`,
  status: i < 10 ? "live" : "offline",
  total_slots: 20,
  used_slots: Math.floor(Math.random() * 15),
  simulated_slots: i < 4 ? Math.floor(Math.random() * 5) + 1 : 0,
  registered_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
}));

// ── Mock NFTs ──
export const MOCK_NFTS: NFTPass[] = Array.from({ length: 30 }, (_, i) => {
  const mintedAt = new Date(Date.now() - Math.random() * 20 * 86400000);
  const expiresAt = new Date(mintedAt.getTime() + 30 * 86400000);
  return {
    id: `nft-${String(i + 1).padStart(4, "0")}`,
    mint_address: `NFT${Math.random().toString(36).slice(2, 10)}`,
    owner_wallet: `Wallet${String((i % 15) + 1).padStart(2, "0")}...${Math.random().toString(36).slice(2, 6)}`,
    tier: Math.min(Math.floor(i / 10) + 1, 3),
    mint_price_sight: [100, 150, 225][Math.min(Math.floor(i / 10), 2)],
    minted_at: mintedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    staked_on_node: i < 20 ? MOCK_NODES[i % MOCK_NODES.length].id : null,
    is_simulated: i >= 25,
  };
});

// ── Mock Reward Pool ──
export const MOCK_REWARD_POOL: RewardPool = {
  total_balance: 184250,
  hourly_payout: 42.5,
  last_distribution: new Date(Date.now() - 1800000).toISOString(),
};

// ── Bonding curve tiers ──
export const BONDING_TIERS = [
  { tier: 1, maxSupply: 500, priceSight: 100 },
  { tier: 2, maxSupply: 1000, priceSight: 150 },
  { tier: 3, maxSupply: 2000, priceSight: 225 },
  { tier: 4, maxSupply: 5000, priceSight: 340 },
  { tier: 5, maxSupply: 10000, priceSight: 500 },
];

export function getCurrentTier(totalMinted: number) {
  for (const t of BONDING_TIERS) {
    if (totalMinted < t.maxSupply) return t;
  }
  return BONDING_TIERS[BONDING_TIERS.length - 1];
}

// ── Aggregate helpers ──
export function getNetworkStats() {
  const liveNodes = MOCK_NODES.filter((n) => n.status === "live");
  const totalSlots = liveNodes.reduce((s, n) => s + n.total_slots, 0);
  const usedSlots = liveNodes.reduce((s, n) => s + n.used_slots, 0);
  const simulatedSlots = liveNodes.reduce((s, n) => s + n.simulated_slots, 0);
  const totalNFTs = MOCK_NFTS.length;
  const stakedNFTs = MOCK_NFTS.filter((n) => n.staked_on_node).length;
  const ratio = totalSlots > 0 ? totalNFTs / totalSlots : 0;

  return {
    nodesOnline: liveNodes.length,
    totalSlots,
    usedSlots,
    freeSlots: totalSlots - usedSlots,
    simulatedSlots,
    totalNFTs,
    stakedNFTs,
    nftSlotRatio: ratio,
    ratioHealth: ratio < 1.3 ? "low" : ratio > 1.8 ? "high" : ("healthy" as "low" | "healthy" | "high"),
    rewardPool: MOCK_REWARD_POOL,
  };
}
