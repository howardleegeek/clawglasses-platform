// Solana-touching constants. Importing from this file pulls @solana/web3.js
// (313 kB stat / 25 kB gzip) into the consumer's bundle. Wallet routes
// (under src/app/(wallet)/) are fine; non-wallet routes (/, /nodes) MUST NOT
// import from this file — use `@/lib/products` for plain product data
// instead. See R1 in docs/BUNDLE-AUDIT.md.

import { PublicKey } from "@solana/web3.js";

// Re-export plain (non-Solana) constants from the chain-free module so existing
// wallet-route call sites that already say `from "@/lib/constants"` keep
// working without churn. The non-wallet `/page.tsx` imports directly from
// `@/lib/products` to avoid the web3.js transitive cost.
export { PRODUCTS, MOCK_STATS, SOLANA_NETWORK } from "@/lib/products";

import { SOLANA_NETWORK } from "@/lib/products";

export const TREASURY_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_WALLET || "3pSs5pnox73YiRnicZQporr9MZnmsX35hiXajQ4rwsCV"
);

export const RPC_ENDPOINT =
  SOLANA_NETWORK === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";

// USDC and USDT on Solana mainnet
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const USDT_MINT = new PublicKey("Es9vMFrzaCERmKkEgvPvAMwVdBjEGHQSy2S4AMPdkSsq");
