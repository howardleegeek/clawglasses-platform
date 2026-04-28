"use client";

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

type TxStatus = "idle" | "building" | "signing" | "confirming" | "success" | "error";

/**
 * Generic hook for building, signing, and sending a Solana transaction.
 * Wraps the wallet adapter's sendTransaction with status tracking.
 */
export function useSendTransaction() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (buildTx: () => Promise<Transaction>) => {
      if (!publicKey) {
        setError("Wallet not connected");
        setStatus("error");
        return null;
      }

      setStatus("building");
      setError(null);
      setTxSignature(null);

      try {
        const tx = await buildTx();

        setStatus("signing");
        const sig = await sendTransaction(tx, connection);

        setStatus("confirming");
        const confirmation = await connection.confirmTransaction(sig, "confirmed");

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        setTxSignature(sig);
        setStatus("success");
        return sig;
      } catch (e: any) {
        const msg = e?.message || "Transaction failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [connection, publicKey, sendTransaction]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxSignature(null);
    setError(null);
  }, []);

  return { execute, status, txSignature, error, reset };
}
