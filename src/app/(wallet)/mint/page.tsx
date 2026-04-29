"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import {
  BONDING_TIERS,
  getCurrentTier,
  MOCK_NFTS,
  MOCK_NODES,
} from "@/lib/mock-data";
import { buildMintNFTPassTx } from "@/lib/solana/mint-nft-pass";
import { useSendTransaction } from "@/hooks/useSendTransaction";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { SIGHT_MINT, SIGHT_DECIMALS } from "@/lib/solana/sight-token";
import { SOLANA_NETWORK } from "@/lib/constants";

function explorerUrl(sig: string) {
  const cluster = SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

export default function MintPage() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [selectedNode, setSelectedNode] = useState<string>("");

  const { execute, status, txSignature, error, reset } = useSendTransaction();
  const { balance: sightBalance, refresh: refreshBalance } = useTokenBalance(
    SIGHT_MINT,
    SIGHT_DECIMALS
  );

  const totalMinted = MOCK_NFTS.length;
  const currentTier = getCurrentTier(totalMinted);
  const canAfford = sightBalance >= currentTier.priceSight;

  const availableNodes = MOCK_NODES.filter(
    (n) => n.status === "live" && n.used_slots < n.total_slots
  );

  async function handleMint() {
    if (!connected || !publicKey) return;

    const sig = await execute(() =>
      buildMintNFTPassTx({
        connection,
        buyerPublicKey: publicKey,
        priceSight: currentTier.priceSight,
      })
    );

    if (sig) refreshBalance();
  }

  const isProcessing = status === "building" || status === "signing" || status === "confirming";

  const statusLabel: Record<string, string> = {
    building: "Building transaction…",
    signing: "Approve in wallet…",
    confirming: "Confirming on-chain…",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-20">
      <h1 className="text-3xl font-bold mb-2">Mint NFT Pass</h1>
      <p className="text-white/50 mb-8">
        Mint a Proof-of-Sight NFT Pass with $SIGHT tokens. Stake it on a node
        to start earning hourly rewards. Passes expire after 30 days.
      </p>

      {/* Bonding curve overview */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Bonding Curve Pricing</h2>
        <div className="space-y-2">
          {BONDING_TIERS.map((t) => {
            const active = t.tier === currentTier.tier;
            return (
              <div
                key={t.tier}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                  active
                    ? "bg-sight-500/10 border border-sight-500/30"
                    : "bg-white/[0.02]"
                }`}
              >
                <span className={active ? "font-semibold text-white" : "text-white/40"}>
                  Tier {t.tier} — up to {t.maxSupply.toLocaleString()} NFTs
                </span>
                <span className={active ? "font-bold text-sight-400" : "text-white/40"}>
                  {t.priceSight} $SIGHT
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-white/40">
          {totalMinted.toLocaleString()} / {currentTier.maxSupply.toLocaleString()} minted in
          current tier
        </p>
      </div>

      {/* Mint card */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Mint Now</h2>
          <div className="text-right">
            <span className="text-2xl font-bold">
              {currentTier.priceSight}{" "}
              <span className="text-sm text-white/40">$SIGHT</span>
            </span>
            {connected && (
              <p className="text-xs text-white/40 mt-0.5">
                Balance: {sightBalance.toLocaleString()} $SIGHT
              </p>
            )}
          </div>
        </div>

        {/* Success state */}
        {status === "success" && txSignature ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🎫</div>
            <p className="text-lg font-semibold">NFT Pass Minted!</p>
            <p className="text-sm text-white/50 mt-1">
              Expires in 30 days. Stake it on a node below to start earning.
            </p>
            <a
              href={explorerUrl(txSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-sight-400 underline underline-offset-2"
            >
              View transaction →
            </a>
            <button onClick={reset} className="btn-secondary mt-4 text-sm block mx-auto">
              Mint Another
            </button>
          </div>
        ) : !connected ? (
          <div className="text-center py-4">
            <p className="mb-3 text-sm text-white/50">Connect wallet to mint</p>
            <WalletButton />
          </div>
        ) : (
          <>
            {/* Error */}
            {status === "error" && error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <button
              onClick={handleMint}
              disabled={isProcessing || !canAfford}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing
                ? statusLabel[status] || "Processing…"
                : !canAfford
                ? "Insufficient $SIGHT balance"
                : `Mint for ${currentTier.priceSight} $SIGHT`}
            </button>
            {!canAfford && connected && (
              <p className="mt-2 text-center text-xs text-white/40">
                Acquire $SIGHT on a DEX (Raydium / Jupiter) to mint
              </p>
            )}
          </>
        )}
      </div>

      {/* Stake selector */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Stake on a Node</h2>
        <p className="text-sm text-white/40 mb-4">
          Select a node with available slots to stake your NFT Pass and start
          earning hourly $SIGHT rewards.
        </p>
        {availableNodes.length === 0 ? (
          <p className="text-sm text-white/40">No nodes with free slots available.</p>
        ) : (
          <div className="space-y-2">
            {availableNodes.map((node) => {
              const freeSlots = node.total_slots - node.used_slots;
              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm border transition-all ${
                    selectedNode === node.id
                      ? "border-sight-500 bg-sight-500/10"
                      : "border-white/5 bg-white/[0.02] hover:border-white/10"
                  }`}
                >
                  <div className="text-left">
                    <span className="font-medium">{node.id}</span>
                    <span className="ml-2 text-white/40">{node.device_model}</span>
                  </div>
                  <span className="text-white/50">
                    {freeSlots}/{node.total_slots} free
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {selectedNode && (
          <button
            className="btn-primary mt-4 w-full"
            onClick={() => {
              // TODO: on-chain stake instruction via Anchor
              alert(`Mock: Staked NFT on ${selectedNode}. In production this will be an on-chain instruction.`);
            }}
          >
            Stake on {selectedNode}
          </button>
        )}
      </div>
    </div>
  );
}
