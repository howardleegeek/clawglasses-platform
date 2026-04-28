"use client";

import { SOLANA_NETWORK } from "@/lib/constants";

interface TxToastProps {
  status: "building" | "signing" | "confirming" | "success" | "error";
  txSignature?: string | null;
  error?: string | null;
  onDismiss?: () => void;
}

function explorerUrl(sig: string) {
  const cluster = SOLANA_NETWORK === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

const labels: Record<string, { text: string; color: string }> = {
  building: { text: "Building transaction…", color: "border-sight-500/30 bg-sight-500/10" },
  signing: { text: "Approve in wallet…", color: "border-yellow-500/30 bg-yellow-500/10" },
  confirming: { text: "Confirming on-chain…", color: "border-sight-500/30 bg-sight-500/10" },
  success: { text: "Transaction confirmed!", color: "border-green-500/30 bg-green-500/10" },
  error: { text: "Transaction failed", color: "border-red-500/30 bg-red-500/10" },
};

export function TxToast({ status, txSignature, error, onDismiss }: TxToastProps) {
  const style = labels[status];
  if (!style) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border p-4 backdrop-blur-lg shadow-xl ${style.color}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{style.text}</p>
          {status === "error" && error && (
            <p className="mt-1 text-xs text-red-300/80 line-clamp-2">{error}</p>
          )}
          {status === "success" && txSignature && (
            <a
              href={explorerUrl(txSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-sight-400 underline underline-offset-2"
            >
              View on Explorer →
            </a>
          )}
        </div>
        {(status === "success" || status === "error") && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-white/40 hover:text-white/70 text-xs"
          >
            ✕
          </button>
        )}
      </div>
      {(status === "building" || status === "signing" || status === "confirming") && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-sight-400" />
        </div>
      )}
    </div>
  );
}
