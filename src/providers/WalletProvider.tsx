"use client";

import { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { RPC_ENDPOINT } from "@/lib/constants";

import "@solana/wallet-adapter-react-ui/styles.css";

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
  const WMP = WalletModalProvider as unknown as FC<{ children: ReactNode }>;

  return (
    <CP endpoint={RPC_ENDPOINT}>
      <SWP wallets={wallets} autoConnect>
        <WMP>{children}</WMP>
      </SWP>
    </CP>
  );
};
