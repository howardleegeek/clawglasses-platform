#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Clawglasses — Anchor Program Deploy Script
# ═══════════════════════════════════════════════════════════

set -e

echo "🔧 Building Anchor program..."
cd "$(dirname "$0")/../anchor"

# Build
anchor build

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/clawglasses-keypair.json)
echo "📋 Program ID: $PROGRAM_ID"

# Update program ID in source
echo "📝 Updating program ID in lib.rs..."
sed -i.bak "s|declare_id!(\".*\")|declare_id!(\"$PROGRAM_ID\")|" programs/clawglasses/src/lib.rs
rm -f programs/clawglasses/src/lib.rs.bak

# Update Anchor.toml
sed -i.bak "s|clawglasses = \".*\"|clawglasses = \"$PROGRAM_ID\"|" Anchor.toml
rm -f Anchor.toml.bak

# Rebuild with correct ID
echo "🔨 Rebuilding with correct program ID..."
anchor build

# Deploy
echo "🚀 Deploying to devnet..."
anchor deploy --provider.cluster devnet

echo ""
echo "✅ Program deployed!"
echo "   Program ID: $PROGRAM_ID"
echo ""
echo "   Update .env.local:"
echo "   NEXT_PUBLIC_PROGRAM_ID=$PROGRAM_ID"

# Initialize the program
echo ""
echo "📋 To initialize the program, run:"
echo "   anchor test --skip-local-validator"
