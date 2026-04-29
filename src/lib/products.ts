// Plain product/marketing data — no chain dependencies.
//
// Why this file is separate from `src/lib/constants.ts`:
// `constants.ts` imports `PublicKey` from `@solana/web3.js` at the top of the
// module. Any file that imports anything from `constants.ts` therefore drags
// the entire 313 kB-stat / 25 kB-gzip web3.js bundle into its route, even if
// it only needs a plain string or number. This file holds the Solana-free
// product/stats objects so the homepage and other non-wallet routes can
// render without paying the wallet-bundle tax.
//
// R1 (2026-04-28): split out so `/` (which only needs PRODUCTS + MOCK_STATS)
// no longer pulls web3.js transitively. This is the prerequisite that lets
// the route-group lift actually shed bytes from non-wallet routes.

export const PRODUCTS = {
  WG1: {
    name: "Clawglasses WG1",
    price: 99,
    description: "AI Smart Glasses",
    specs: ["On-device AI assistant", "Voice commands", "12h battery", "40g titanium"],
  },
  WG2: {
    name: "Clawglasses WG2 AR",
    price: 599,
    description: "AR Display + Rokid",
    specs: [
      "Full waveguide AR display",
      "89-language translation",
      "12MP Sony camera",
      "4K@30fps video",
      "Dual NPU",
    ],
  },
} as const;

// Mock stats (replace with Supabase realtime later).
export const MOCK_STATS = {
  nodesOnline: 47,
  nftsMinted: 1283,
  nftsStaked: 892,
  sightDistributed: 284750,
};

export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet") as
  | "devnet"
  | "mainnet-beta";
