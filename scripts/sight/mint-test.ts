/**
 * End-to-end mint smoke test.
 *
 *   tsx scripts/sight/mint-test.ts \
 *        --keypair ~/.config/solana/id.json \
 *        --tree <tree_pubkey> \
 *        --collection <collection_pubkey> \
 *        --metadata-uri https://arweave.net/<hash>.json \
 *        --cluster devnet
 *
 * Deposits a single cNFT license into the caller's wallet. Prints the
 * bubblegum tx signature. Intended as a CI check — runs against devnet
 * after a fresh deploy to confirm the plumbing is wired correctly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { mintV1, createMplBubblegumProgram } from '@metaplex-foundation/mpl-bubblegum';
import { tierForAlive } from '../../lib/sight/mint/pricing';

function arg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

async function main() {
  const keypairPath = arg('keypair');
  const treeAddr = arg('tree');
  const collection = arg('collection');
  const metadataUri = arg('metadata-uri');
  const aliveCount = Number(arg('alive', '0'));
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
  umi.programs.add(createMplBubblegumProgram(), true);

  const tier = tierForAlive(aliveCount);
  console.log(`→ cluster    : ${cluster}`);
  console.log(`→ caller     : ${signer.publicKey.toString()}`);
  console.log(`→ tree       : ${treeAddr}`);
  console.log(`→ collection : ${collection}`);
  console.log(`→ tier       : ${tier.code} (cost ${tier.costSight} $SIGHT, alive=${aliveCount})`);

  const tx = await mintV1(umi, {
    leafOwner: signer.publicKey,
    merkleTree: publicKey(treeAddr),
    metadata: {
      name: `SIGHT License ${tier.code} (test)`,
      symbol: 'SIGHT',
      uri: metadataUri,
      sellerFeeBasisPoints: 600,
      collection: { key: publicKey(collection), verified: false },
      creators: [{ address: signer.publicKey, verified: true, share: 100 }],
    },
  }).sendAndConfirm(umi);

  console.log('\n✅ Mint smoke OK');
  console.log(`signature : ${Buffer.from(tx.signature).toString('base64')}`);
  console.log('DAS indexer (Helius) usually reflects new asset in ~5-10s.');
}

main().catch((err) => {
  console.error('[mint-test] failed:', err);
  process.exit(1);
});
