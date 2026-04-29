"use client";

/**
 * WalletAvailableContext — boolean signal that the current subtree is wrapped
 * in `<WalletProvider>` and therefore safe to render `<WalletMultiButton>`.
 *
 * Why this exists: R1 lifted `<WalletProvider>` out of the root layout into
 * `src/app/(wallet)/layout.tsx`. The `<Navbar>` (which contains the wallet
 * button) is rendered by the *root* layout so it appears on every route —
 * including `/` and `/nodes`, which deliberately do NOT have a wallet
 * provider in their tree.
 *
 * `WalletMultiButton` calls `useWallet()` internally; rendering it without a
 * provider throws at runtime. We can't try/catch a hook (rules of hooks), so
 * we gate via context: routes inside `(wallet)/` flip this flag to `true` and
 * the navbar renders the real button; everywhere else, the navbar renders a
 * lightweight `<Link href="/dashboard">` that takes the user to a wallet
 * route where the provider exists.
 *
 * Default is `false` so any route that forgets to wrap in `<WalletProvider>`
 * fails closed — link, not a runtime crash.
 */

import { createContext, useContext } from "react";

const WalletAvailableContext = createContext<boolean>(false);

export function WalletAvailableProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletAvailableContext.Provider value={true}>
      {children}
    </WalletAvailableContext.Provider>
  );
}

export function useWalletAvailable(): boolean {
  return useContext(WalletAvailableContext);
}
