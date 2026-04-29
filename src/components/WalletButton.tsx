"use client";

/**
 * WalletButton — dynamic wrapper around `<WalletMultiButton>`.
 *
 * Two-layer deferral:
 *
 *   1. Route-level (R1): on routes outside the `(wallet)/` group, the
 *      `<WalletProvider>` is not in the tree. We detect this via
 *      `useWalletAvailable()` and render a plain `<Link href="/dashboard">`
 *      instead. The `next/dynamic` import below is referenced but never
 *      executed, so the wallet-modal chunk is NOT downloaded on `/` or
 *      `/nodes`. This is the unlock that makes `/` + `/nodes` shed
 *      ~50-90 kB of First Load JS.
 *
 *   2. Click-level (R2): inside the `(wallet)/` group, `WalletMultiButton`
 *      is loaded via `next/dynamic` with `ssr: false`. The placeholder
 *      ships in the initial HTML; the real button hydrates after first
 *      paint. With R1 in place, the lazy chunks here are now genuinely
 *      deferred (R2 alone could not achieve this because the root layout
 *      pinned them to every route's manifest).
 *
 * The placeholder uses `wallet-adapter-button wallet-adapter-button-trigger`
 * so the global overrides in `globals.css` (`!h-11`, `!bg-sight-500`,
 * `!rounded-xl`, `!font-semibold`) plus the default lib styles
 * (`padding: 0 24px`, `font-size: 16px`) apply identically — no layout
 * shift when the real button mounts.
 *
 * Note: `@solana/wallet-adapter-react-ui/styles.css` is still imported at
 * module load via `src/providers/WalletProvider.tsx`. Only the JS payload
 * is deferred.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useWalletAvailable } from "@/components/WalletAvailableContext";

const DynamicWalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        className="wallet-adapter-button wallet-adapter-button-trigger"
        disabled
        aria-label="Loading wallet button"
      >
        Select Wallet
      </button>
    ),
  }
);

export function WalletButton() {
  const walletAvailable = useWalletAvailable();

  if (!walletAvailable) {
    // No `<WalletProvider>` in the tree → don't try to mount the modal.
    // Send the user to `/dashboard`, which lives inside `(wallet)/` and has
    // the provider, where the real "Select Wallet" UI is reachable.
    return (
      <Link
        href="/dashboard"
        className="wallet-adapter-button wallet-adapter-button-trigger"
        aria-label="Connect wallet on dashboard"
      >
        Connect Wallet
      </Link>
    );
  }

  return <DynamicWalletMultiButton />;
}
