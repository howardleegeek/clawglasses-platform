// Admin-only mock data — lives under `src/app/admin/`, allowlisted by
// the simulated-leak CI guard. Anything that distinguishes simulated
// stakes from real ones MUST live here, not in `src/lib/mock-data.ts`.
//
// PRD v4 §4: simulated stakes must be indistinguishable from real ones
// on every public surface. The admin dashboard is the only surface
// allowed to see the split.

import {
  MOCK_NODES,
  MOCK_NFTS,
  MOCK_REWARD_POOL,
  type Node,
  type NFTPass,
} from "@/lib/mock-data";

// ── Admin-only types ──
//
// Extend the public shapes with the simulation fields. The rest of the
// app should keep importing `Node` / `NFTPass` from `@/lib/mock-data`
// — those satisfy `AdminNode` / `AdminNftPass` structurally, so admin
// code can take a public row and decorate it.
export type AdminNode = Node & {
  simulated_slots: number;
  real_slots: number;
};

export type AdminNftPass = NFTPass & {
  is_simulated: boolean;
};

// ── Admin Mock Nodes ──
//
// Same generator as the public list, but adds the simulation split.
// The `simulated_slots` derivation matches the original mock: the first
// four nodes carry 1–5 simulated stakes; the rest carry zero.
export const ADMIN_MOCK_NODES: AdminNode[] = MOCK_NODES.map((n, i) => {
  const simulated_slots = i < 4 ? Math.floor(Math.random() * 5) + 1 : 0;
  const real_slots = Math.max(0, n.used_slots - simulated_slots);
  return {
    ...n,
    simulated_slots,
    real_slots,
  };
});

// ── Admin Mock NFTs ──
//
// Same generator as the public list, but flags the last 5 as simulated.
export const ADMIN_MOCK_NFTS: AdminNftPass[] = MOCK_NFTS.map((nft, i) => ({
  ...nft,
  is_simulated: i >= 25,
}));

// ── Admin network stats (with simulation totals) ──
export function getAdminNetworkStats() {
  const liveNodes = ADMIN_MOCK_NODES.filter((n) => n.status === "live");
  const totalSlots = liveNodes.reduce((s, n) => s + n.total_slots, 0);
  const usedSlots = liveNodes.reduce((s, n) => s + n.used_slots, 0);
  const simulatedSlots = liveNodes.reduce((s, n) => s + n.simulated_slots, 0);
  const totalNFTs = ADMIN_MOCK_NFTS.length;
  const stakedNFTs = ADMIN_MOCK_NFTS.filter((n) => n.staked_on_node).length;
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
