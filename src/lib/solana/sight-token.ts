/**
 * $SIGHT SPL Token utilities.
 *
 * On devnet we use a test-minted $SIGHT (testSIGHT).
 * The mint authority can be set via env; defaults to a placeholder.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";

/** $SIGHT token decimals (standard SPL = 9) */
export const SIGHT_DECIMALS = 9;

/**
 * $SIGHT mint address.
 * On devnet, deploy a test token and set this env var.
 *
 * Falls back to the Solana System Program address (32 ones), which is:
 *   - valid base58 (so `new PublicKey(...)` doesn't throw at module load),
 *   - not a real SPL token mint (so balance queries fail gracefully → 0),
 *   - recognizably fake to anyone reading on-chain logs.
 *
 * The previous "SIGHTxxxx...x1" placeholder contained lowercase 'x' which
 * is NOT a valid base58 character; that crashed prerender at build time.
 */
export const SIGHT_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_SIGHT_MINT || "11111111111111111111111111111111"
);

/**
 * Get a wallet's $SIGHT balance (human-readable).
 * Returns 0 if the ATA doesn't exist.
 */
export async function getSightBalance(
  connection: Connection,
  walletPubkey: PublicKey
): Promise<number> {
  try {
    const ata = getAssociatedTokenAddressSync(SIGHT_MINT, walletPubkey);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 10 ** SIGHT_DECIMALS;
  } catch {
    return 0;
  }
}

/**
 * Get a wallet's token balance for an arbitrary SPL mint (human-readable).
 */
export async function getTokenBalance(
  connection: Connection,
  walletPubkey: PublicKey,
  mint: PublicKey,
  decimals: number
): Promise<number> {
  try {
    const ata = getAssociatedTokenAddressSync(mint, walletPubkey);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 10 ** decimals;
  } catch {
    return 0;
  }
}
