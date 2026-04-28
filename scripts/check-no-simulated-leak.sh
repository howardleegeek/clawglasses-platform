#!/usr/bin/env bash
# =====================================================================
# CI guard — blocks `is_simulated` and admin-only stake fields from
# leaking outside the admin perimeter.
#
# Layout (post-merge with kai68 base):
#   src/app/admin/**        admin frontend
#   supabase/functions/**   admin/cron edge functions
#   src/lib/supabase/**     typed Supabase client (some types include
#                           is_simulated — restricted to this file)
#   anchor/**               Anchor program (on-chain truth)
#
# PRD v4 §4: simulated stakes must be indistinguishable from real ones
# on every public surface. If this script exits non-zero, something
# just leaked the field — fix it before merging.
#
# Wire into CI: "npm run prebuild" or a GitHub Actions step.
# =====================================================================

set -euo pipefail

ALLOWED_PATHS_REGEX='^(src/lib/supabase/types\.ts|src/lib/supabase/api\.ts|src/app/admin/|supabase/(migrations|functions)/|anchor/|MERGE-NOTES\.md|docs/MIGRATION-v8\.1-to-PRD-v4\.md|SECURITY\.md|scripts/check-no-simulated-leak\.sh)'

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

# 2. Built-bundle leak — `is_simulated` or "simulated" in any non-admin chunk.
#    Only runs if .next/ exists.
if [ -d .next/static/chunks ]; then
  BAD_CHUNKS=$(
    grep -lE 'is_simulated|"simulated_slots"' .next/static/chunks/*.js 2>/dev/null \
    | grep -vE 'app/admin/' \
    || true
  )
  if [ -n "$BAD_CHUNKS" ]; then
    echo "BLOCKED — simulated/is_simulated leaked into a non-admin chunk:"
    echo "$BAD_CHUNKS"
    echo "These chunks ship to every visitor. Remove the leak source and rebuild."
    exit 1
  fi
fi

echo "OK — no is_simulated leak detected."
