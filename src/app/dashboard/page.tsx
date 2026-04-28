"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { SIGHT_MINT, SIGHT_DECIMALS } from "@/lib/solana/sight-token";
import { USDC_MINT, USDT_MINT } from "@/lib/constants";
import { fetchNftPasses, fetchRewardClaims, type NftRow } from "@/lib/supabase/api";
import Link from "next/link";

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const { balance: sightBal } = useTokenBalance(SIGHT_MINT, SIGHT_DECIMALS);
  const { balance: usdcBal } = useTokenBalance(USDC_MINT, 6);
  const { balance: usdtBal } = useTokenBalance(USDT_MINT, 6);

  const [nfts, setNfts] = useState<NftRow[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) return;
    const wallet = publicKey.toBase58();

    Promise.all([
      fetchNftPasses(wallet),
      fetchRewardClaims(wallet),
    ]).then(([n, r]) => {
      setNfts(n);
      setRewards(r);
      setLoading(false);
    });
  }, [publicKey]);

  if (!connected) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold mb-3">My Dashboard</h1>
        <p className="text-white/50 mb-6">Connect your wallet to view your NFTs and rewards.</p>
        <WalletMultiButton />
      </div>
    );
  }

  const stakedNfts = nfts.filter((n) => n.is_staked);
  const unstakedNfts = nfts.filter((n) => !n.is_staked);
  const totalRewards = rewards.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-20">
      <h1 className="text-3xl font-bold mb-8">My Dashboard</h1>

      {/* Wallet balances */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {[
          { label: "$SIGHT", value: sightBal.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
          { label: "USDC", value: usdcBal.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
          { label: "USDT", value: usdtBal.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
        ].map((b) => (
          <div key={b.label} className="card text-center">
            <div className="text-2xl font-bold stat-glow">{b.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/40">{b.label}</div>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold">{nfts.length}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-white/40">My NFT Passes</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold">{stakedNfts.length}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-white/40">Staked</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold stat-glow">
            {totalRewards.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-white/40">$SIGHT Earned</div>
        </div>
      </div>

      {/* Staked NFTs */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">
          Staked NFTs ({stakedNfts.length})
        </h2>
        {stakedNfts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-white/40 mb-3">No staked NFTs yet.</p>
            <Link href="/mint" className="btn-primary text-sm">
              Mint & Stake
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {stakedNfts.map((nft) => {
              const expires = new Date(nft.expires_at);
              const daysLeft = Math.max(
                0,
                Math.ceil((expires.getTime() - Date.now()) / 86400000)
              );
              return (
                <div
                  key={nft.id}
                  className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium">NFT #{nft.mint_index}</span>
                    <span className="ml-2 text-white/40">Tier {nft.tier}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white/50">→ {nft.staked_on?.slice(0, 12)}…</span>
                    <span
                      className={`ml-3 text-xs ${
                        daysLeft <= 3 ? "text-red-400" : "text-white/40"
                      }`}
                    >
                      {daysLeft}d left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unstaked NFTs */}
      {unstakedNfts.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Unstaked NFTs ({unstakedNfts.length})
          </h2>
          <div className="space-y-2">
            {unstakedNfts.map((nft) => (
              <div
                key={nft.id}
                className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium">NFT #{nft.mint_index}</span>
                  <span className="ml-2 text-white/40">Tier {nft.tier}</span>
                </div>
                <Link href="/mint" className="text-sight-400 text-xs hover:underline">
                  Stake Now →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Rewards */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Rewards</h2>
        {rewards.length === 0 ? (
          <p className="text-sm text-white/40">
            No rewards yet. Stake an NFT to start earning.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {rewards.slice(0, 20).map((r, i) => (
              <div
                key={r.id || i}
                className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-2 text-xs"
              >
                <span className="text-white/50">
                  {new Date(r.claimed_at).toLocaleString()}
                </span>
                <span className="font-medium text-sight-400">
                  +{r.amount.toFixed(4)} $SIGHT
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
