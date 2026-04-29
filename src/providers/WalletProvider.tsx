"use client";

import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { RPC_ENDPOINT } from "@/lib/constants";

import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Lazy-load WalletModalProvider so its chunks (modal UI ~35 kB,
 * qrcode + adapter glue ~47 kB) load only after first paint.
 *
 * Why a manual loader and not next/dynamic:
 *   next/dynamic's `loading` slot is for spinners, not pass-through —
 *   it does NOT receive children. Using it would either render blank
 *   during the chunk fetch (bad UX on a layout that wraps the entire
 *   wallet-route subtree) or require a Suspense fallback that re-mounts
 *   children when the promise resolves.
 *
 * Behavior:
 *   - First paint: children render WITHOUT modal context.
 *     useWalletModal() is only called from event handlers (the wallet
 *     button click), never during render → the missing context is
 *     invisible until the user actually clicks.
 *   - After ~50-200ms: chunk lands, state updates, children re-wrap
 *     inside the real WalletModalProvider. Wallet connection state
 *     lives in <SolanaWalletProvider> one level up, so it survives the
 *     transition. Local component state on wallet routes will refire
 *     its useEffects, which is harmless (data refetches, no breaking).
 */
function LazyWalletModalProvider({ children }: { children: ReactNode }) {
  const [Mod, setMod] = useState<FC<{ children: ReactNode }> | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("@solana/wallet-adapter-react-ui").then((m) => {
      if (cancelled) return;
      setMod(
        () => m.WalletModalProvider as unknown as FC<{ children: ReactNode }>,
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return Mod ? <Mod>{children}</Mod> : <>{children}</>;
}

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  // TODO(phase-2): drop these casts once @solana/wallet-adapter-react publishes
  // types compatible with @types/react 18.3+. See:
  // https://github.com/anza-xyz/wallet-adapter/issues/2341
  // The runtime contract is unchanged; this is purely a .d.ts version skew.
  const CP = ConnectionProvider as unknown as FC<{ endpoint: string; children: ReactNode }>;
  const SWP = SolanaWalletProvider as unknown as FC<{
    wallets: typeof wallets;
    autoConnect?: boolean;
    children: ReactNode;
  }>;

  return (
    <CP endpoint={RPC_ENDPOINT}>
      <SWP wallets={wallets} autoConnect>
        <LazyWalletModalProvider>{children}</LazyWalletModalProvider>
      </SWP>
    </CP>
  );
};
