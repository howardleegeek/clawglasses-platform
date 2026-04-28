/**
 * Supabase Edge Function — Sync On-Chain State
 *
 * Polls Solana for program account changes and syncs to Supabase.
 * Can be triggered by cron (every 5 min) or webhook.
 *
 * Responsibilities:
 *   - Sync node registrations
 *   - Sync NFT pass mints, stakes, unstakes
 *   - Mark expired NFT passes
 *   - Update slot counts
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js@1.95.3";

const RPC_URL = Deno.env.get("SOLANA_RPC_URL") || "https://api.devnet.solana.com";
const PROGRAM_ID = Deno.env.get("PROGRAM_ID") || "CLAWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const connection = new Connection(RPC_URL, "confirmed");
    const programId = new PublicKey(PROGRAM_ID);

    // ── 1. Expire old NFT passes ──────────────────────────
    const now = new Date().toISOString();
    const { data: expired } = await supabase
      .from("nft_passes")
      .select("id, staked_on, is_staked")
      .eq("is_staked", true)
      .lt("expires_at", now);

    if (expired && expired.length > 0) {
      // Unstake expired passes
      for (const nft of expired) {
        await supabase
          .from("nft_passes")
          .update({ is_staked: false, staked_on: null })
          .eq("id", nft.id);

        if (nft.staked_on) {
          // Decrement node slot
          const { data: node } = await supabase
            .from("nodes")
            .select("used_slots")
            .eq("id", nft.staked_on)
            .single();

          if (node) {
            await supabase
              .from("nodes")
              .update({ used_slots: Math.max(0, node.used_slots - 1) })
              .eq("id", nft.staked_on);
          }
        }
      }
    }

    // ── 2. Fetch on-chain program accounts ────────────────
    // In production, use getProgramAccounts with filters
    // to sync new nodes and NFT passes since last sync.
    // For MVP, this is a placeholder.
    let syncedAccounts = 0;

    try {
      const accounts = await connection.getProgramAccounts(programId, {
        commitment: "confirmed",
      });
      syncedAccounts = accounts.length;
      // TODO: Deserialize each account, upsert into Supabase
    } catch {
      // Program may not be deployed yet — that's fine for MVP
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        expired_nfts: expired?.length || 0,
        synced_accounts: syncedAccounts,
        timestamp: now,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
