"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getTokenBalance } from "@/lib/solana/sight-token";

/**
 * React hook — polls the balance of an SPL token for the connected wallet.
 * Returns { balance, loading, refresh }.
 */
export function useTokenBalance(mint: PublicKey, decimals: number) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setBalance(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const bal = await getTokenBalance(connection, publicKey, mint, decimals);
      setBalance(bal);
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, mint, decimals]);

  useEffect(() => {
    refresh();
    // Re-fetch every 30 s
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { balance, loading, refresh };
}
