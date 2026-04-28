#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Clawglasses — Devnet Setup Script
# Run this once to create the $SIGHT test token on devnet
# and configure your .env.local
# ═══════════════════════════════════════════════════════════

set -e

echo "🔧 Clawglasses Devnet Setup"
echo "═══════════════════════════"

# Check prerequisites
command -v solana >/dev/null 2>&1 || { echo "❌ solana CLI not found. Install: https://docs.solana.com/cli/install-solana-cli-tools"; exit 1; }
command -v spl-token >/dev/null 2>&1 || { echo "❌ spl-token CLI not found. Install: cargo install spl-token-cli"; exit 1; }

# Ensure devnet
echo "📡 Switching to devnet..."
solana config set --url https://api.devnet.solana.com

WALLET=$(solana address)
echo "👛 Wallet: $WALLET"

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
  echo "📥 Requesting airdrop..."
  solana airdrop 2
  sleep 5
fi

# Create $SIGHT token (9 decimals, standard SPL)
echo ""
echo "🪙 Creating testSIGHT token..."
SIGHT_MINT=$(spl-token create-token --decimals 9 2>&1 | grep "Creating token" | awk '{print $3}')
echo "✅ $SIGHT Mint: $SIGHT_MINT"

# Create token account and mint initial supply
echo "📦 Creating token account..."
spl-token create-account $SIGHT_MINT

echo "🏭 Minting 10,000,000 testSIGHT..."
spl-token mint $SIGHT_MINT 10000000

# Create reward pool wallet (just another keypair for now)
echo ""
echo "🏦 Creating reward pool keypair..."
REWARD_POOL_KEYPAIR="$HOME/.config/solana/reward-pool.json"
if [ ! -f "$REWARD_POOL_KEYPAIR" ]; then
  solana-keygen new --outfile "$REWARD_POOL_KEYPAIR" --no-bip39-passphrase --force
fi
REWARD_POOL=$(solana address -k "$REWARD_POOL_KEYPAIR")
echo "✅ Reward Pool: $REWARD_POOL"

# Fund reward pool
echo "📥 Funding reward pool with SOL for tx fees..."
solana transfer $REWARD_POOL 0.1

# Create SIGHT token account for reward pool
echo "📦 Creating reward pool SIGHT account..."
spl-token create-account $SIGHT_MINT --owner $REWARD_POOL --fee-payer "$HOME/.config/solana/id.json"

# Update .env.local
ENV_FILE="$(dirname "$0")/../.env.local"
echo ""
echo "📝 Updating .env.local..."

if [ -f "$ENV_FILE" ]; then
  # Update existing values
  sed -i.bak "s|^NEXT_PUBLIC_SIGHT_MINT=.*|NEXT_PUBLIC_SIGHT_MINT=$SIGHT_MINT|" "$ENV_FILE"
  sed -i.bak "s|^NEXT_PUBLIC_REWARD_POOL_WALLET=.*|NEXT_PUBLIC_REWARD_POOL_WALLET=$REWARD_POOL|" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
else
  cat > "$ENV_FILE" << EOF
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_TREASURY_WALLET=$WALLET
NEXT_PUBLIC_SIGHT_MINT=$SIGHT_MINT
NEXT_PUBLIC_REWARD_POOL_WALLET=$REWARD_POOL
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
EOF
fi

echo ""
echo "═══════════════════════════"
echo "✅ Setup complete!"
echo ""
echo "  SIGHT Mint:     $SIGHT_MINT"
echo "  Reward Pool:    $REWARD_POOL"
echo "  Treasury:       $WALLET"
echo ""
echo "Next steps:"
echo "  1. npm install && npm run dev"
echo "  2. Connect Phantom wallet (devnet)"
echo "  3. Send yourself some testSIGHT to test minting"
echo ""
echo "To send testSIGHT to a wallet:"
echo "  spl-token transfer $SIGHT_MINT 1000 <RECIPIENT_WALLET>"
echo "═══════════════════════════"
