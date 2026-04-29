"use client";

/**
 * WalletButton — dynamic wrapper around `<WalletMultiButton>`.
 *
 * Why: `@solana/wallet-adapter-react-ui` pulls in the wallet modal,
 * `qrcode.js`, and the picker UI (~30-50 kB gzip on /dashboard, 15-25 kB on
 * /mint and /purchase). None of that is needed until the user actually
 * clicks "Select Wallet". `next/dynamic` with `ssr: false` defers the
 * import until first paint completes, then hydrates in place.
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

export const WalletButton = dynamic(
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
