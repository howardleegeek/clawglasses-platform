/**
 * Deploy a Bubblegum merkle tree for the ClawGlasses $SIGHT cNFT
 * collection. Run once per cluster:
 *
 *   tsx scripts/sight/deploy-tree.ts --keypair ~/.config/solana/id.json
 *
 * Prints:
 *   - Merkle tree public key  → NEXT_PUBLIC_SIGHT_TREE
 *   - Tree authority          → treasury multisig
 *
 * Capacity: 2^14 = 16,384 leaves (enough for 10K supply + future re-mints)
 * depthSizePair 14/64 is the standard "small DePIN" config.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner, keypairIdentity, sol } from '@metaplex-foundation/umi';
import { createTree } from '@metaplex-foundation/mpl-bubblegum';

function arg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

async function main() {
  const keypairPath = arg('keypair');
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

  const merkleTree = generateSigner(umi);
  console.log(`→ cluster   : ${cluster}`);
  console.log(`→ endpoint  : ${endpoint}`);
  console.log(`→ creator   : ${signer.publicKey.toString()}`);
  console.log(`→ tree      : ${merkleTree.publicKey.toString()}`);

  const builder = await createTree(umi, {
    merkleTree,
    maxDepth: 14,
    maxBufferSize: 64,
  });
  const tx = await builder.sendAndConfirm(umi);

  console.log('\n✅ Tree deployed');
  console.log(`signature  : ${Buffer.from(tx.signature).toString('base64')}`);
  console.log('\nAdd to your .env.local:');
  console.log(`NEXT_PUBLIC_SIGHT_TREE=${merkleTree.publicKey.toString()}`);
}

main().catch((err) => {
  console.error('[deploy-tree] failed:', err);
  process.exit(1);
});
