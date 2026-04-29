// (wallet) — route group for routes that need a Solana wallet.
//
// Why a route group: `(wallet)` is parenthesized, so Next.js excludes it from
// the URL path. `/mint` stays at `/mint`, `/dashboard` stays at `/dashboard`,
// etc. — only the layout boundary changes.
//
// Why this layout exists: until R1, `<WalletProvider>` was wrapped around the
// entire app at `src/app/layout.tsx`, which forced the wallet adapter
// (`@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`,
// `@solana/wallet-adapter-wallets`) and its transitive web3.js + crypto
// polyfills onto every route's First Load JS — including `/` and `/nodes`,
// which never touch a wallet. This layout scopes the provider to only the
// routes that need it: /mint, /purchase, /dashboard, /admin.
//
// Note: this layout is intentionally minimal. The root layout still emits
// `<html><body>`, the alpha banner, the JSON-LD blocks, and `<Navbar />` —
// every public route still gets all of those. This file ONLY adds the
// wallet provider to the subtree.
//
// `WalletAvailableProvider` flips a context flag that the navbar's
// `<WalletButton>` reads to decide whether to render the real
// `<WalletMultiButton>` (here) or a fallback `<Link>` (on non-wallet routes).

import { WalletProvider } from "@/providers/WalletProvider";
import { WalletAvailableProvider } from "@/components/WalletAvailableContext";

export default function WalletGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProvider>
      <WalletAvailableProvider>{children}</WalletAvailableProvider>
    </WalletProvider>
  );
}
