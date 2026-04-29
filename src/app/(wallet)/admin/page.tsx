"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import {
  fetchNetworkStats,
  type NetworkStats,
} from "@/lib/supabase/api";
import {
  fetchAdminNodes,
  fetchAdminNftPasses,
  updateSimulatedSlots,
  type AdminNodeRow,
  type AdminNftRow,
} from "@/lib/supabase/admin-api";
import { BONDING_TIERS } from "@/lib/mock-data";

/**
 * Alpha-period admin gate.
 *
 * The data layer (migration 002) already revokes anon SELECT on raw
 * `nodes` / `nft_passes`, so an anon visitor reaching this route would
 * see an empty UI. That's safe but unprofessional — and one screenshot
 * away from a "their admin panel is open" thread.
 *
 * This route gate makes /admin return a real 404 to anyone whose deploy
 * doesn't explicitly set NEXT_PUBLIC_ADMIN_ENABLED=true. Local dev keeps
 * working: just `NEXT_PUBLIC_ADMIN_ENABLED=true` in your .env.local.
 *
 * Phase-2 replacement: wallet-signature or NextAuth session check.
 * See GAPS.md §5 action item 5.
 */
const ADMIN_ENABLED = process.env.NEXT_PUBLIC_ADMIN_ENABLED === "true";

export default function AdminPage() {
  if (!ADMIN_ENABLED) {
    // Renders the framework 404 page. Anon visitors can't tell whether
    // /admin exists at all — silent default.
    notFound();
  }

  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [nodes, setNodes] = useState<AdminNodeRow[]>([]);
  const [nfts, setNfts] = useState<AdminNftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("");

  function log(msg: string) {
    setActionLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  }

  async function refresh() {
    const [s, n, nf] = await Promise.all([
      fetchNetworkStats(),
      fetchAdminNodes(),
      fetchAdminNftPasses(),
    ]);
    setStats(s);
    setNodes(n);
    setNfts(nf);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addSimulated(nodeId: string, count: number) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const newSim = node.simulated_slots + count;
    const newUsed = node.used_slots + count;
    await updateSimulatedSlots(nodeId, newSim, newUsed);
    log(`Added ${count} simulated stakes to ${nodeId.slice(0, 12)}…`);
    await refresh();
  }

  async function removeSimulated(nodeId: string, count: number) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const toRemove = Math.min(count, node.simulated_slots);
    const newSim = node.simulated_slots - toRemove;
    const newUsed = node.used_slots - toRemove;
    await updateSimulatedSlots(nodeId, newSim, Math.max(0, newUsed));
    log(`Removed ${toRemove} simulated stakes from ${nodeId.slice(0, 12)}…`);
    await refresh();
  }

  function triggerDistribution() {
    if (!stats) return;
    const hourly = stats.rewardPoolBalance * 0.0005;
    log(`Manual distribution: ${hourly.toFixed(2)} $SIGHT → ${stats.stakedNFTs} stakers`);
  }

  if (loading || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/40">Loading admin data…</div>
      </div>
    );
  }

  const simulatedNfts = nfts.filter((n) => n.is_simulated);
  const expiredNfts = nfts.filter((n) => new Date(n.expires_at) < new Date());
  const totalSimSlots = nodes.reduce((s, n) => s + n.simulated_slots, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-24 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-white/50 mt-1">
            Internal controls for simulated stakes, reward pool, and network health.
          </p>
        </div>
        <button onClick={refresh} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          {
            label: "NFT / Slot Ratio",
            value: stats.nftSlotRatio.toFixed(2),
            health: stats.ratioHealth,
          },
          { label: "Simulated Stakes", value: totalSimSlots },
          {
            label: "Reward Pool",
            value: `${stats.rewardPoolBalance.toLocaleString()} $SIGHT`,
          },
          { label: "Expired NFTs", value: expiredNfts.length },
        ].map((m) => (
          <div key={m.label} className="card">
            <div className="text-xs uppercase tracking-wider text-white/40 mb-1">
              {m.label}
            </div>
            <div className="text-2xl font-bold">{m.value}</div>
            {"health" in m && m.health && (
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.health === "healthy"
                    ? "bg-green-500/10 text-green-400"
                    : m.health === "low"
                    ? "bg-yellow-500/10 text-yellow-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {m.health === "healthy"
                  ? "Healthy (1.3–1.8)"
                  : m.health === "low"
                  ? "Below target — add simulated stakes"
                  : "Above target — open more slots"}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Simulated stakes controls */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Simulated Stake Controls</h2>
          <p className="text-sm text-white/50 mb-4">
            Select a node and add/remove simulated stakes to keep the NFT/Slot
            ratio in the 1.3–1.8 profitable range.
          </p>

          {/* Node selector */}
          <label className="text-xs text-white/40 mb-1 block">Target Node</label>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-dark-800/50 px-3 py-2.5 text-sm text-white mb-4 focus:border-sight-500 focus:outline-none"
          >
            <option value="">Select a node…</option>
            {nodes
              .filter((n) => n.status === "live")
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id.slice(0, 12)}… — {n.device_model} — sim:{n.simulated_slots} — free:
                  {n.total_slots - n.used_slots}
                </option>
              ))}
          </select>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => selectedNode && addSimulated(selectedNode, 5)}
              disabled={!selectedNode}
              className="btn-primary text-sm disabled:opacity-30"
            >
              + Add 5
            </button>
            <button
              onClick={() => selectedNode && addSimulated(selectedNode, 10)}
              disabled={!selectedNode}
              className="btn-primary text-sm disabled:opacity-30"
            >
              + Add 10
            </button>
            <button
              onClick={() => selectedNode && removeSimulated(selectedNode, 5)}
              disabled={!selectedNode}
              className="btn-secondary text-sm disabled:opacity-30"
            >
              − Remove 5
            </button>
          </div>
          <p className="text-sm text-white/40">
            Total simulated across network:{" "}
            <span className="font-semibold text-white">{totalSimSlots}</span>
            {" "}— rewards from these route to Treasury.
          </p>
        </div>

        {/* Reward pool controls */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Reward Pool</h2>
          <div className="space-y-2 mb-4">
            {[
              ["Total Balance", `${stats.rewardPoolBalance.toLocaleString()} $SIGHT`],
              ["Hourly Payout (~0.05%)", `${(stats.rewardPoolBalance * 0.0005).toFixed(2)} $SIGHT`],
              ["Active Stakers", String(stats.stakedNFTs)],
              [
                "Per-NFT/hr",
                stats.stakedNFTs > 0
                  ? `${((stats.rewardPoolBalance * 0.0005) / stats.stakedNFTs).toFixed(4)} $SIGHT`
                  : "0 $SIGHT",
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-white/50">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
          <button onClick={triggerDistribution} className="btn-primary text-sm w-full">
            Manual Distribution
          </button>
        </div>

        {/* Bonding curve status */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Bonding Curve Status</h2>
          <p className="text-xs text-white/40 mb-3">
            Total minted: {stats.totalNFTs}
          </p>
          {BONDING_TIERS.map((t) => {
            const prevMax = t.tier === 1 ? 0 : BONDING_TIERS[t.tier - 2].maxSupply;
            const tierCapacity = t.maxSupply - prevMax;
            const mintedSoFar = Math.max(0, Math.min(stats.totalNFTs - prevMax, tierCapacity));
            const pct = tierCapacity > 0 ? (mintedSoFar / tierCapacity) * 100 : 0;
            return (
              <div
                key={t.tier}
                className="mb-3 last:mb-0"
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Tier {t.tier}</span>
                  <span className="font-mono text-sight-400">
                    {t.priceSight} $SIGHT
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sight-500 transition-all"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="text-xs text-white/30 mt-0.5">
                  {mintedSoFar} / {tierCapacity}
                </div>
              </div>
            );
          })}
        </div>

        {/* Simulated NFT list */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            Simulated NFTs ({simulatedNfts.length})
          </h2>
          {simulatedNfts.length === 0 ? (
            <p className="text-sm text-white/40">No simulated NFTs active.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {simulatedNfts.map((nft) => (
                <div
                  key={nft.id}
                  className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2 text-xs"
                >
                  <span className="font-mono">{nft.id.slice(0, 16)}…</span>
                  <span className="text-white/40">
                    → {nft.staked_on?.slice(0, 12) || "unstaked"}
                  </span>
                  <button
                    onClick={() => log(`Removed simulated NFT ${nft.id.slice(0, 12)}`)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action log */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-3">Action Log</h2>
        {actionLog.length === 0 ? (
          <p className="text-sm text-white/40">No actions yet this session.</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-xs text-white/50">
            {actionLog.map((entry, i) => (
              <div key={i}>{entry}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
