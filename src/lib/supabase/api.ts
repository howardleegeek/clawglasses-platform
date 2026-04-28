/**
 * Supabase API layer — all DB queries go through here.
 * Falls back to mock data when Supabase is not connected.
 */
import { supabase, isSupabaseConnected } from "./client";
import {
  MOCK_NODES,
  MOCK_NFTS,
  MOCK_REWARD_POOL,
  getNetworkStats as getMockStats,
  type Node as MockNode,
  type NFTPass as MockNFT,
} from "@/lib/mock-data";

// ── Types ─────────────────────────────────────────────────
export interface NetworkStats {
  nodesOnline: number;
  totalSlots: number;
  usedSlots: number;
  freeSlots: number;
  simulatedSlots: number;
  totalNFTs: number;
  stakedNFTs: number;
  nftSlotRatio: number;
  ratioHealth: "low" | "healthy" | "high";
  rewardPoolBalance: number;
  lastDistribution: string | null;
}

export interface NodeRow {
  id: string;
  owner_wallet: string;
  device_model: string;
  status: "live" | "offline";
  total_slots: number;
  used_slots: number;
  simulated_slots: number;
  registered_at: string;
}

export interface NftRow {
  id: string;
  owner_wallet: string;
  mint_index: number;
  tier: number;
  mint_price: number;
  minted_at: string;
  expires_at: string;
  staked_on: string | null;
  is_staked: boolean;
  is_simulated: boolean;
}

// ── Network Stats ─────────────────────────────────────────
export async function fetchNetworkStats(): Promise<NetworkStats> {
  if (!isSupabaseConnected) {
    const m = getMockStats();
    return {
      nodesOnline: m.nodesOnline,
      totalSlots: m.totalSlots,
      usedSlots: m.usedSlots,
      freeSlots: m.freeSlots,
      simulatedSlots: m.simulatedSlots,
      totalNFTs: m.totalNFTs,
      stakedNFTs: m.stakedNFTs,
      nftSlotRatio: m.nftSlotRatio,
      ratioHealth: m.ratioHealth,
      rewardPoolBalance: m.rewardPool.total_balance,
      lastDistribution: m.rewardPool.last_distribution,
    };
  }

  const { data } = await supabase
    .from("v_network_stats")
    .select("*")
    .single();

  if (!data) throw new Error("Failed to fetch network stats");

  const ratio = data.nft_slot_ratio || 0;
  return {
    nodesOnline: data.nodes_online,
    totalSlots: data.total_slots,
    usedSlots: data.used_slots,
    freeSlots: data.total_slots - data.used_slots,
    simulatedSlots: data.simulated_slots,
    totalNFTs: data.total_nfts,
    stakedNFTs: data.staked_nfts,
    nftSlotRatio: ratio,
    ratioHealth: ratio < 1.3 ? "low" : ratio > 1.8 ? "high" : "healthy",
    rewardPoolBalance: data.reward_pool_balance,
    lastDistribution: null,
  };
}

// ── Nodes ─────────────────────────────────────────────────
export async function fetchNodes(): Promise<NodeRow[]> {
  if (!isSupabaseConnected) {
    return MOCK_NODES.map((n) => ({
      id: n.id,
      owner_wallet: n.owner_wallet,
      device_model: n.device_model,
      status: n.status,
      total_slots: n.total_slots,
      used_slots: n.used_slots,
      simulated_slots: n.simulated_slots,
      registered_at: n.registered_at,
    }));
  }

  const { data, error } = await supabase
    .from("nodes")
    .select("*")
    .order("registered_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// ── NFT Passes ────────────────────────────────────────────
export async function fetchNftPasses(wallet?: string): Promise<NftRow[]> {
  if (!isSupabaseConnected) {
    let nfts = MOCK_NFTS;
    if (wallet) nfts = nfts.filter((n) => n.owner_wallet === wallet);
    return nfts.map((n) => ({
      id: n.id,
      owner_wallet: n.owner_wallet,
      mint_index: n.tier, // simplified
      tier: n.tier,
      mint_price: n.mint_price_sight,
      minted_at: n.minted_at,
      expires_at: n.expires_at,
      staked_on: n.staked_on_node,
      is_staked: n.staked_on_node !== null,
      is_simulated: n.is_simulated,
    }));
  }

  let query = supabase
    .from("nft_passes")
    .select("*")
    .order("minted_at", { ascending: false });

  if (wallet) query = query.eq("owner_wallet", wallet);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ── Orders ────────────────────────────────────────────────
export async function createOrder(order: {
  buyer_wallet: string;
  product_key: "WG1" | "WG2";
  price: number;
  pay_token: "USDC" | "USDT";
  tx_signature: string;
  shipping_name: string;
  shipping_email: string;
  shipping_address: string;
}) {
  if (!isSupabaseConnected) {
    console.log("[Mock] Order created:", order);
    return { id: "mock-order-" + Date.now() };
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({ ...order, status: "paid" as const })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

// ── Record NFT Mint ───────────────────────────────────────
export async function recordNftMint(nft: {
  owner_wallet: string;
  mint_index: number;
  tier: number;
  mint_price: number;
  tx_signature: string;
}) {
  if (!isSupabaseConnected) {
    console.log("[Mock] NFT minted:", nft);
    return { id: "mock-nft-" + Date.now() };
  }

  const { data, error } = await supabase
    .from("nft_passes")
    .insert(nft)
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

// ── Admin: Add/Remove Simulated Stakes ────────────────────
export async function updateSimulatedSlots(
  nodeId: string,
  simulatedSlots: number,
  usedSlots: number
) {
  if (!isSupabaseConnected) {
    console.log("[Mock] Updated simulated slots:", { nodeId, simulatedSlots, usedSlots });
    return;
  }

  const { error } = await supabase
    .from("nodes")
    .update({ simulated_slots: simulatedSlots, used_slots: usedSlots })
    .eq("id", nodeId);

  if (error) throw error;
}

// ── Reward Claims for a wallet ────────────────────────────
export async function fetchRewardClaims(wallet: string) {
  if (!isSupabaseConnected) {
    return [];
  }

  const { data, error } = await supabase
    .from("reward_claims")
    .select("*")
    .eq("wallet", wallet)
    .order("claimed_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}
