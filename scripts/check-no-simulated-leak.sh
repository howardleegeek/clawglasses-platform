#!/usr/bin/env bash
# =====================================================================
# CI guard — blocks `is_simulated` and admin-only stake fields from
# leaking outside the admin perimeter.
#
# Layout (post-merge with kai68 base, plus R1 route-group lift):
#   src/app/(wallet)/admin/** admin frontend (R1 moved into (wallet) group;
#                             URL is still /admin — Next.js strips parens)
#   supabase/functions/**     admin/cron edge functions
#   src/lib/supabase/**       typed Supabase client (some types include
#                             is_simulated — restricted to this file)
#   anchor/**                 Anchor program (on-chain truth)
#
# PRD v4 §4: simulated stakes must be indistinguishable from real ones
# on every public surface. If this script exits non-zero, something
# just leaked the field — fix it before merging.
#
# Wire into CI: "npm run prebuild" or a GitHub Actions step.
# =====================================================================

set -euo pipefail

ALLOWED_PATHS_REGEX='^(src/lib/supabase/types\.ts|src/lib/supabase/api\.ts|src/lib/supabase/admin-api\.ts|src/app/admin/|src/app/\(wallet\)/admin/|supabase/(migrations|functions)/|anchor/|MERGE-NOTES\.md|docs/MIGRATION-v8\.1-to-PRD-v4\.md|SECURITY\.md|scripts/check-no-simulated-leak\.sh|GAPS\.md)'

# 1. Source-tree leak — `is_simulated` outside the admin perimeter.
SOURCE_LEAKS=$(
  grep -RIn --include='*.ts' --include='*.tsx' --include='*.rs' --include='*.sql' \
    -e 'is_simulated' -e 'simulated_slots' \
    src supabase anchor 2>/dev/null \
  | grep -vE "$ALLOWED_PATHS_REGEX" \
  || true
)

if [ -n "$SOURCE_LEAKS" ]; then
  echo "BLOCKED — is_simulated / simulated_slots referenced outside admin perimeter:"
  echo "$SOURCE_LEAKS"
  echo
  echo "Allowed paths: $ALLOWED_PATHS_REGEX"
  echo "If this is intentional admin code, place it under one of those paths."
  echo "If you need a public NFT shape, omit the simulated columns."
  exit 1
fi

# 2. Built-bundle leak — admin column names in any non-admin chunk.
#    Only runs if .next/ exists.
#
# Regex covers BOTH quoted and bare keys:
#   "simulated_slots"  → quoted JSON form
#   simulated_slots:   → minified bare key (what agent-3's Playwright caught)
#   .simulated_slots   → property access in minified code
# Same patterns for is_simulated.
if [ -d .next/static/chunks ]; then
  BAD_CHUNKS=$(
    grep -RlE 'is_simulated|simulated_slots' .next/static/chunks/ 2>/dev/null \
    | grep -vE 'app/admin/|app/\(wallet\)/admin/' \
    || true
  )
  if [ -n "$BAD_CHUNKS" ]; then
    echo "BLOCKED — simulated_slots / is_simulated leaked into a non-admin chunk:"
    echo "$BAD_CHUNKS"
    echo
    echo "These chunks ship to every visitor. Move the leak source into an"
    echo "admin-perimeter file (src/lib/supabase/admin-api.ts or src/app/admin/)"
    echo "so it only ships to the /admin route."
    exit 1
  fi
fi

echo "OK — no is_simulated leak detected."
