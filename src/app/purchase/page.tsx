"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PRODUCTS, TREASURY_WALLET, USDC_MINT, USDT_MINT } from "@/lib/constants";
import { buildSPLTransferTx } from "@/lib/solana/transfer-spl";
import { useSendTransaction } from "@/hooks/useSendTransaction";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { SOLANA_NETWORK } from "@/lib/constants";

type ProductKey = keyof typeof PRODUCTS;
type PayToken = "USDC" | "USDT";

const MINT_MAP: Record<PayToken, typeof USDC_MINT> = {
  USDC: USDC_MINT,
  USDT: USDT_MINT,
};
const TOKEN_DECIMALS = 6;

function explorerUrl(sig: string) {
  const cluster = SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

export default function PurchasePage() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [selected, setSelected] = useState<ProductKey>("WG1");
  const [payToken, setPayToken] = useState<PayToken>("USDC");
  const [shipping, setShipping] = useState({ name: "", email: "", address: "" });

  const { execute, status, txSignature, error, reset } = useSendTransaction();
  const { balance: tokenBalance } = useTokenBalance(MINT_MAP[payToken], TOKEN_DECIMALS);

  const product = PRODUCTS[selected];
  const canPay = tokenBalance >= product.price;

  async function handlePurchase() {
    if (!connected || !publicKey) return;

    await execute(() =>
      buildSPLTransferTx({
        connection,
        senderPublicKey: publicKey,
        recipientPublicKey: TREASURY_WALLET,
        mintAddress: MINT_MAP[payToken],
        amount: product.price,
      })
    );
  }

  /* ── Success state ── */
  if (status === "success" && txSignature) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-20 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-white/60 max-w-md">
          Your {product.name} purchase is recorded. Once your device ships and
          is activated, it will appear as a live node on the network.
        </p>
        <a
          href={explorerUrl(txSignature)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-sm text-sight-400 underline underline-offset-2"
        >
          View transaction on Explorer →
        </a>
        <button onClick={reset} className="btn-secondary mt-6 text-sm">
          Make Another Purchase
        </button>
      </div>
    );
  }

  const isProcessing = status === "building" || status === "signing" || status === "confirming";

  const statusLabel: Record<string, string> = {
    building: "Building transaction…",
    signing: "Approve in wallet…",
    confirming: "Confirming on-chain…",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-20">
      <h1 className="text-3xl font-bold mb-8">Buy Clawglasses Hardware</h1>

      {/* Product selector */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {(Object.entries(PRODUCTS) as [ProductKey, (typeof PRODUCTS)[ProductKey]][]).map(
          ([key, p]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`card text-left transition-all ${
                selected === key
                  ? "border-sight-500 ring-1 ring-sight-500/50"
                  : "hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <span className="text-xl font-bold">${p.price}</span>
              </div>
              <p className="text-sm text-white/50">{p.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.specs.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/50"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </button>
          )
        )}
      </div>

      {/* Payment token */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">Payment Token</h2>
        <div className="flex gap-3">
          {(["USDC", "USDT"] as PayToken[]).map((t) => (
            <button
              key={t}
              onClick={() => setPayToken(t)}
              className={`rounded-xl px-5 py-2.5 text-sm font-medium border transition-all ${
                payToken === t
                  ? "border-sight-500 bg-sight-500/10 text-white"
                  : "border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-2xl font-bold">
            {product.price} <span className="text-sm text-white/40">{payToken}</span>
          </span>
          {connected && (
            <span className="text-sm text-white/40">
              Balance: {tokenBalance.toLocaleString()} {payToken}
            </span>
          )}
        </div>
      </div>

      {/* Shipping info */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">Shipping Details</h2>
        <div className="space-y-3">
          {[
            { key: "name", label: "Full Name", type: "text" },
            { key: "email", label: "Email", type: "email" },
            { key: "address", label: "Shipping Address", type: "text" },
          ].map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm text-white/50">{f.label}</label>
              <input
                type={f.type}
                value={shipping[f.key as keyof typeof shipping]}
                onChange={(e) =>
                  setShipping({ ...shipping, [f.key]: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-dark-800/50 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-sight-500 focus:outline-none focus:ring-1 focus:ring-sight-500/50"
                placeholder={f.label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {status === "error" && error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* CTA */}
      {!connected ? (
        <div className="text-center">
          <p className="mb-3 text-sm text-white/50">Connect your wallet to purchase</p>
          <WalletMultiButton />
        </div>
      ) : (
        <button
          onClick={handlePurchase}
          disabled={
            isProcessing ||
            !shipping.name ||
            !shipping.email ||
            !shipping.address ||
            !canPay
          }
          className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isProcessing
            ? statusLabel[status] || "Processing…"
            : !canPay
            ? `Insufficient ${payToken} balance`
            : `Pay ${product.price} ${payToken}`}
        </button>
      )}
    </div>
  );
}
