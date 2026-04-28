# $SIGHT cNFT mint — deploy scripts

One-shot CLI scripts to stand up the on-chain artifacts that
`lib/sight/mint/client.ts` talks to. Run them **in order**, on the
cluster you want to target.

Prereqs:

- `npm install` in the repo root.
- A Solana keypair JSON with ≥ 0.5 SOL on the target cluster
  (`~/.config/solana/id.json` by default).
- Collection metadata hosted on Arweave (or any immutable URL).
- `tsx` available via `npx tsx` if not installed globally.

---

## 1 · Merkle tree (cNFT storage)

```bash
npx tsx scripts/sight/deploy-tree.ts \
  --keypair ~/.config/solana/id.json \
  --cluster devnet
```

Outputs the tree pubkey — paste it into `.env.local`:

```
NEXT_PUBLIC_SIGHT_TREE=<tree_pubkey>
```

Default capacity: `maxDepth=14`, `maxBufferSize=64` → 16,384 leaves.
Enough for the full 10K supply plus re-mints after expiry.

## 2 · Collection NFT

Host your metadata JSON on Arweave first (example payload:
`lib/sight/mint/collection.ts` → `licenseMetadata(...)`). Then:

```bash
npx tsx scripts/sight/deploy-collection.ts \
  --keypair ~/.config/solana/id.json \
  --metadata-uri https://arweave.net/<hash>.json \
  --cluster devnet
```

Outputs the collection mint pubkey:

```
NEXT_PUBLIC_SIGHT_COLLECTION_MINT=<collection_pubkey>
```

## 3 · Treasury & cluster

Fill in the treasury (burn authority for $SIGHT + royalty destination)
and target cluster:

```
NEXT_PUBLIC_SIGHT_TREASURY=<treasury_pubkey>
NEXT_PUBLIC_SIGHT_CLUSTER=devnet
# optional: custom Helius/Triton endpoint
NEXT_PUBLIC_SIGHT_RPC=https://rpc.helius.xyz/?api-key=...
```

Once all three env vars are set, `readMintConfig()` returns non-null and
`/sight/mint` flips from "reservation" mode to live on-chain mint.

## 4 · Verify

```bash
# Sanity-check that the UI sees the config
grep NEXT_PUBLIC_SIGHT .env.local
```

Then in `/sight/mint`:

- Connect a wallet with enough $SIGHT for the current tier.
- Click Mint — wallet prompts for signature.
- Success toast fires with Solscan tx link.
- Refresh and the mint page alive count bumps (DAS indexer lag
  usually ≤ 10 s on Helius).

## 5 · Rotate / redeploy

Deploying a new tree or collection only requires re-running the script
and updating the env var. Old mints keep working until their lifetime
expires — which is exactly the v8.1 design.
