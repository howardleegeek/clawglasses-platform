/**
 * Deploy the collection NFT for ClawGlasses $SIGHT node licenses.
 * Run once per cluster (after deploy-tree.ts):
 *
 *   tsx scripts/sight/deploy-collection.ts --keypair ~/.config/solana/id.json \
 *        --metadata-uri https://arweave.net/<hash>.json
 *
 * Prints the collection mint address → NEXT_PUBLIC_SIGHT_COLLECTION_MINT.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner, keypairIdentity, percentAmount } from '@metaplex-foundation/umi';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';

function arg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

async function main() {
  const keypairPath = arg('keypair');
  const metadataUri = arg('metadata-uri');
  const name = arg('name', 'ClawGlasses $SIGHT Node Licenses');
  const symbol = arg('symbol', 'SIGHT');
  const cluster = arg('cluster', 'devnet') as 'mainnet-beta' | 'devnet' | 'testnet';
  const endpoint =
    process.env.SIGHT_RPC ||
    (cluster === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : cluster === 'devnet'
      ? 'https://api.devnet.solana.com'
      : 'https://api.testnet.solana.com');

  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve(keypairPath), 'utf8')));
  const umi = createUmi(endpoint);
  const signer = umi.eddsa.createKeypairFromSecretKey(secret);
  umi.use(keypairIdentity(signer));

  const collectionMint = generateSigner(umi);
  console.log(`→ cluster    : ${cluster}`);
  console.log(`→ creator    : ${signer.publicKey.toString()}`);
  console.log(`→ collection : ${collectionMint.publicKey.toString()}`);
  console.log(`→ metadata   : ${metadataUri}`);

  const tx = await createNft(umi, {
    mint: collectionMint,
    name,
    symbol,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(6), // 6% royalty → Magic Eden buyback
    isCollection: true,
  }).sendAndConfirm(umi);

  console.log('\n✅ Collection deployed');
  console.log(`signature   : ${Buffer.from(tx.signature).toString('base64')}`);
  console.log('\nAdd to your .env.local:');
  console.log(`NEXT_PUBLIC_SIGHT_COLLECTION_MINT=${collectionMint.publicKey.toString()}`);
}

main().catch((err) => {
  console.error('[deploy-collection] failed:', err);
  process.exit(1);
});
