/**
 * Upload a collection metadata JSON to Arweave via Bundlr.
 *
 *   tsx scripts/sight/upload-metadata.ts \
 *        --keypair ~/.config/solana/id.json \
 *        --image https://arweave.net/<image-hash> \
 *        --cluster devnet
 *
 * Prints the metadata URI → NEXT_PUBLIC_SIGHT_METADATA_URI + pass to
 * deploy-collection.ts. Uploading via Bundlr pays in SOL (cheap).
 *
 * If you host metadata yourself (S3 + cache, IPFS, etc.), skip this and
 * pass that URL directly to deploy-collection.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, createGenericFile } from '@metaplex-foundation/umi';
import { licenseMetadata } from '../../lib/sight/mint/collection';
import { TIER_TABLE } from '../../lib/sight/mint/pricing';

function arg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

async function main() {
  const keypairPath = arg('keypair');
  const imageUri = arg('image');
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

  // Collection-level metadata. Matches v8.1 semantics.
  const tier = TIER_TABLE[0];
  const metadata = licenseMetadata({
    tier,
    assetIndex: 0,
    collectionName: 'ClawGlasses $SIGHT Node Licenses',
    imageUri,
    externalUrl: 'https://clawglasses.com/sight',
  });

  const file = createGenericFile(
    Buffer.from(JSON.stringify(metadata, null, 2)),
    'sight-collection.json',
    { contentType: 'application/json' }
  );

  const uploader = umi.uploader;
  const [uri] = await uploader.upload([file]);

  console.log(`→ cluster : ${cluster}`);
  console.log(`→ creator : ${signer.publicKey.toString()}`);
  console.log(`→ image   : ${imageUri}`);
  console.log(`\n✅ Metadata uploaded`);
  console.log(`uri       : ${uri}`);
  console.log('\nPass next:');
  console.log(`  tsx scripts/sight/deploy-collection.ts --keypair ... --metadata-uri ${uri}`);
  console.log(`And set:`);
  console.log(`  NEXT_PUBLIC_SIGHT_METADATA_URI=${uri}`);
}

main().catch((err) => {
  console.error('[upload-metadata] failed:', err);
  process.exit(1);
});
