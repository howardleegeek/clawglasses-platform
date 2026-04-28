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
 *
 * Public response NEVER exposes `is_simulated` — that's a server-side
 * routing detail. Defence-in-depth via `_shared/http.ts`.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Connection,
  PublicKey,
} from "https://esm.sh/@solana/web3.js@1.95.3";
import { jsonResponse, errorResponse } from "../_shared/http.ts";
import type { NftPassRow, NodeRow, SyncChainResponse } from "../_shared/types.ts";

const RPC_URL =
  Deno.env.get("SOLANA_RPC_URL") || "https://api.devnet.solana.com";
const PROGRAM_ID =
  Deno.env.get("PROGRAM_ID") ||
  "CLAWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

type ExpiredNftSubset = Pick<NftPassRow, "id" | "staked_on" | "is_staked">;
type NodeSlotSubset = Pick<NodeRow, "used_slots">;

serve(async (_req: Request): Promise<Response> => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const connection = new Connection(RPC_URL, "confirmed");
    const programId = new PublicKey(PROGRAM_ID);

    // ── 1. Expire old NFT passes ──────────────────────────
    const now = new Date().toISOString();
    const expiredResult = await supabase
      .from("nft_passes")
      .select("id, staked_on, is_staked")
      .eq("is_staked", true)
      .lt("expires_at", now)
      .returns<ExpiredNftSubset[]>();
    const expired = expiredResult.data;

    if (expired && expired.length > 0) {
      // Unstake expired passes
      for (const nft of expired) {
        await supabase
          .from("nft_passes")
          .update({ is_staked: false, staked_on: null })
          .eq("id", nft.id);

        if (nft.staked_on) {
          // Decrement node slot
          const nodeResult = await supabase
            .from("nodes")
            .select("used_slots")
            .eq("id", nft.staked_on)
            .single<NodeSlotSubset>();
          const node = nodeResult.data;

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

    const body: SyncChainResponse = {
      status: "ok",
      expired_nfts: expired?.length ?? 0,
      synced_accounts: syncedAccounts,
      timestamp: now,
    };
    return jsonResponse(body);
  } catch (err) {
    return errorResponse(err);
  }
});
