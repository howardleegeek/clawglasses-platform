"use client";

import { useEffect, useState } from "react";
import { fetchNodes, fetchNetworkStats, type NodeRow, type NetworkStats } from "@/lib/supabase/api";
import { MOCK_REWARD_POOL } from "@/lib/mock-data";

export default function NodesPage() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchNetworkStats(), fetchNodes()]).then(([s, n]) => {
      setStats(s);
      setNodes(n);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/40">Loading network data…</div>
      </div>
    );
  }

  const hourlyPayout = stats.rewardPoolBalance * 0.0005; // same rate as edge function

  return (
    <div className="mx-auto max-w-6xl px-4 pt-24 pb-20">
      <h1 className="text-3xl font-bold mb-2">Network Nodes</h1>
      <p className="text-white/50 mb-8">
        Live view of all Proof-of-Sight mining nodes and reward pool status.
      </p>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { label: "Nodes Online", value: stats.nodesOnline, glow: true },
          { label: "Total Slots", value: `${stats.usedSlots} / ${stats.totalSlots} used` },
          { label: "NFT / Slot Ratio", value: stats.nftSlotRatio.toFixed(2), glow: true },
          {
            label: "Reward Pool",
            value: `${stats.rewardPoolBalance.toLocaleString()} $SIGHT`,
          },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <div className={`text-2xl font-bold ${s.glow ? "stat-glow" : ""}`}>
              {s.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/40">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Ratio health indicator */}
      <div className="card mb-8 flex items-center gap-4">
        <div
          className={`h-3 w-3 rounded-full ${
            stats.ratioHealth === "healthy"
              ? "bg-green-400"
              : stats.ratioHealth === "low"
              ? "bg-yellow-400"
              : "bg-red-400"
          }`}
        />
        <div>
          <span className="font-medium">NFT/Slot Ratio: </span>
          <span className="text-white/60">
            {stats.ratioHealth === "healthy"
              ? "Healthy range (1.3–1.8). System is profitable."
              : stats.ratioHealth === "low"
              ? "Below target. Consider adding simulated stakes or incentivizing minting."
              : "Above target. Consider opening more node slots."}
          </span>
        </div>
      </div>

      {/* Hourly payout info */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-2">Reward Distribution</h2>
        <p className="text-sm text-white/50">
          Pool distributes{" "}
          <span className="font-semibold text-sight-400">
            ~{hourlyPayout.toFixed(2)} $SIGHT
          </span>{" "}
          per hour, split equally across {stats.stakedNFTs} staked NFTs.
        </p>
        <p className="text-sm text-white/50 mt-1">
          Per-NFT hourly reward:{" "}
          <span className="font-semibold text-white">
            {stats.stakedNFTs > 0
              ? (hourlyPayout / stats.stakedNFTs).toFixed(4)
              : "0"}{" "}
            $SIGHT
          </span>
        </p>
      </div>

      {/* Node table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-dark-900/50 text-left text-xs uppercase tracking-wider text-white/40">
              <th className="px-4 py-3">Node ID</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Slots</th>
              <th className="px-4 py-3">Owner</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr
                key={node.id}
                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs">{node.id.slice(0, 12)}…</td>
                <td className="px-4 py-3">{node.device_model}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                      node.status === "live"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-white/5 text-white/30"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        node.status === "live" ? "bg-green-400" : "bg-white/30"
                      }`}
                    />
                    {node.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-white/70">{node.used_slots}</span>
                  <span className="text-white/30"> / {node.total_slots}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-white/40">
                  {node.owner_wallet.slice(0, 8)}…{node.owner_wallet.slice(-4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
