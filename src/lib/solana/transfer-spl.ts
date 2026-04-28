/**
 * SPL Token transfer helper — sends USDC or USDT to the treasury wallet.
 * Works on devnet and mainnet.
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

/** Both USDC and USDT use 6 decimals on Solana */
const TOKEN_DECIMALS = 6;

interface TransferSPLParams {
  connection: Connection;
  senderPublicKey: PublicKey;
  recipientPublicKey: PublicKey;
  mintAddress: PublicKey;
  /** Human-readable amount, e.g. 99 for $99 USDC */
  amount: number;
}

/**
 * Builds a transaction that transfers `amount` of an SPL token
 * (USDC / USDT) from sender to recipient.
 *
 * - Auto-creates the recipient ATA if it doesn't exist.
 * - Returns an unsigned Transaction for the wallet adapter to sign.
 */
export async function buildSPLTransferTx({
  connection,
  senderPublicKey,
  recipientPublicKey,
  mintAddress,
  amount,
}: TransferSPLParams): Promise<Transaction> {
  const lamports = BigInt(Math.round(amount * 10 ** TOKEN_DECIMALS));

  const senderATA = getAssociatedTokenAddressSync(mintAddress, senderPublicKey);
  const recipientATA = getAssociatedTokenAddressSync(mintAddress, recipientPublicKey);

  const instructions: TransactionInstruction[] = [];

  // Create recipient ATA if it doesn't exist yet
  try {
    await getAccount(connection, recipientATA);
  } catch (e) {
    if (e instanceof TokenAccountNotFoundError) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          senderPublicKey, // payer
          recipientATA,
          recipientPublicKey,
          mintAddress
        )
      );
    } else {
      throw e;
    }
  }

  instructions.push(
    createTransferCheckedInstruction(
      senderATA,
      mintAddress,
      recipientATA,
      senderPublicKey,
      lamports,
      TOKEN_DECIMALS
    )
  );

  const tx = new Transaction().add(...instructions);
  tx.feePayer = senderPublicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  return tx;
}
