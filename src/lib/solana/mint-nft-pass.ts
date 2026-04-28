/**
 * NFT Pass minting — builds a transaction that:
 *   1. Transfers $SIGHT from user → reward pool (60%) + treasury (40%)
 *   2. Mints a Proof-of-Sight NFT Pass to the user's wallet
 *
 * NOTE: This is a CLIENT-SIDE transaction builder.
 * In production, step 2 should be an Anchor CPI that atomically
 * burns/transfers $SIGHT and mints the NFT in a single program call.
 *
 * For the MVP / devnet phase, we split into two instructions:
 *   - SPL transfer of $SIGHT
 *   - Placeholder for Metaplex NFT mint (logged, not yet on-chain)
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { SIGHT_MINT, SIGHT_DECIMALS } from "./sight-token";
import { TREASURY_WALLET } from "@/lib/constants";

/** Reward pool wallet — in production this is a PDA owned by the program */
const REWARD_POOL_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_REWARD_POOL_WALLET || TREASURY_WALLET.toBase58()
);

/** Fee split: 60 % → reward pool, 40 % → treasury */
const REWARD_POOL_SHARE = 0.6;
const TREASURY_SHARE = 0.4;

interface MintNFTPassParams {
  connection: Connection;
  buyerPublicKey: PublicKey;
  /** Price in $SIGHT (human-readable, e.g. 100) */
  priceSight: number;
}

/**
 * Builds a transaction that transfers $SIGHT to fund the reward pool
 * and treasury, representing the NFT Pass mint cost.
 *
 * The actual NFT mint instruction will be added once the Anchor
 * program is deployed. For now, return the $SIGHT transfer tx.
 */
export async function buildMintNFTPassTx({
  connection,
  buyerPublicKey,
  priceSight,
}: MintNFTPassParams): Promise<Transaction> {
  const rewardAmount = BigInt(
    Math.round(priceSight * REWARD_POOL_SHARE * 10 ** SIGHT_DECIMALS)
  );
  const treasuryAmount = BigInt(
    Math.round(priceSight * TREASURY_SHARE * 10 ** SIGHT_DECIMALS)
  );

  const buyerATA = getAssociatedTokenAddressSync(SIGHT_MINT, buyerPublicKey);
  const rewardPoolATA = getAssociatedTokenAddressSync(SIGHT_MINT, REWARD_POOL_WALLET);
  const treasuryATA = getAssociatedTokenAddressSync(SIGHT_MINT, TREASURY_WALLET);

  const instructions: TransactionInstruction[] = [];

  // Ensure reward pool ATA exists
  try {
    await getAccount(connection, rewardPoolATA);
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          buyerPublicKey,
          rewardPoolATA,
          REWARD_POOL_WALLET,
          SIGHT_MINT
        )
      );
    }
  }

  // Ensure treasury ATA exists
  try {
    await getAccount(connection, treasuryATA);
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          buyerPublicKey,
          treasuryATA,
          TREASURY_WALLET,
          SIGHT_MINT
        )
      );
    }
  }

  // Transfer 60% → reward pool
  instructions.push(
    createTransferCheckedInstruction(
      buyerATA,
      SIGHT_MINT,
      rewardPoolATA,
      buyerPublicKey,
      rewardAmount,
      SIGHT_DECIMALS
    )
  );

  // Transfer 40% → treasury
  instructions.push(
    createTransferCheckedInstruction(
      buyerATA,
      SIGHT_MINT,
      treasuryATA,
      buyerPublicKey,
      treasuryAmount,
      SIGHT_DECIMALS
    )
  );

  // TODO: Add Metaplex / Anchor CPI instruction to mint the actual NFT here
  // For now the NFT mint is logged client-side as a placeholder

  const tx = new Transaction().add(...instructions);
  tx.feePayer = buyerPublicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return tx;
}
