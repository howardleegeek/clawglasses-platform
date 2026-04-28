import { PublicKey } from "@solana/web3.js";

export const TREASURY_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_WALLET || "3pSs5pnox73YiRnicZQporr9MZnmsX35hiXajQ4rwsCV"
);

export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet") as
  | "devnet"
  | "mainnet-beta";

export const RPC_ENDPOINT =
  SOLANA_NETWORK === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";

// USDC and USDT on Solana mainnet
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const USDT_MINT = new PublicKey("Es9vMFrzaCERmKkEgvPvAMwVdBjEGHQSy2S4AMPdkSsq");

// Products
export const PRODUCTS = {
  WG1: { name: "Clawglasses WG1", price: 99, description: "AI Smart Glasses", specs: ["On-device AI assistant", "Voice commands", "12h battery", "40g titanium"] },
  WG2: { name: "Clawglasses WG2 AR", price: 599, description: "AR Display + Rokid", specs: ["Full waveguide AR display", "89-language translation", "12MP Sony camera", "4K@30fps video", "Dual NPU"] },
} as const;

// Mock stats (replace with Supabase realtime later)
export const MOCK_STATS = {
  nodesOnline: 47,
  nftsMinted: 1283,
  nftsStaked: 892,
  sightDistributed: 284750,
};
