#!/bin/bash
cd "$(dirname "$0")"

echo "🔧 Pushing Clawglasses to GitHub..."
echo "═══════════════════════════════════"

# Remove stale lock file if exists
rm -f .git/index.lock

# Init git if needed
if [ ! -d ".git" ] || ! git rev-parse HEAD &> /dev/null 2>&1; then
  git init
  git checkout -b main
  git config user.name "Kai Chen"
  git config user.email "kaichen0608@gmail.com"
  git add -A
  git commit -m "Initial commit — Clawglasses DePIN platform

Complete Web3 platform for AI smart glasses with Proof-of-Sight mining:
- Next.js 14 frontend (6 pages: landing, purchase, mint, nodes, dashboard, admin)
- Solana wallet integration (Phantom/Solflare) with real SPL token transfers
- Anchor smart contract (NFT mint, stake/unstake, simulated stakes, reward distribution)
- Supabase backend (schema, Edge Functions for hourly rewards + chain sync)
- Bonding curve NFT pricing, 60/40 fee split, NFT/Slot ratio monitoring

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
else
  # Make sure we have a clean commit
  git config user.name "Kai Chen"
  git config user.email "kaichen0608@gmail.com"
  git add -A
  git diff --cached --quiet || git commit -m "Initial commit — Clawglasses DePIN platform

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
fi

# Set remote
git remote remove origin 2>/dev/null
git remote add origin git@github.com:kai68/clawglasses.git

echo ""
echo "📤 Pushing to kai68/clawglasses..."
git push -u origin main --force

echo ""
echo "═══════════════════════════════════"
echo "✅ Done! View at:"
echo "   https://github.com/kai68/clawglasses"
echo ""
echo "Press any key to close..."
read -n 1
