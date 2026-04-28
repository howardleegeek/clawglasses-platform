/**
 * Supabase Edge Function — Hourly Reward Distribution
 *
 * Triggered by pg_cron every hour:
 *   SELECT cron.schedule('distribute-rewards', '0 * * * *',
 *     $$SELECT net.http_post(url := 'https://<project>.supabase.co/functions/v1/distribute-rewards', ...)$$
 *   );
 *
 * Logic:
 *   1. Read reward pool balance
 *   2. Calculate hourly payout (configurable % of pool)
 *   3. Find all staked, non-expired NFT passes
 *   4. Split payout equally across stakers
 *   5. Simulated stakes → reward goes to treasury wallet
 *   6. Real stakes → record claim for user to collect
 *   7. Log the distribution
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HOURLY_PAYOUT_RATE = 0.0005; // 0.05% of pool per hour
const TREASURY_WALLET = Deno.env.get("TREASURY_WALLET") || "3pSs5pnox73YiRnicZQporr9MZnmsX35hiXajQ4rwsCV";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get reward pool
    const { data: pool } = await supabase
      .from("reward_pool")
      .select("id, total_balance")
      .single();

    if (!pool || pool.total_balance <= 0) {
      return new Response(JSON.stringify({ status: "skip", reason: "empty pool" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const hourlyPayout = pool.total_balance * HOURLY_PAYOUT_RATE;

    // 2. Get all staked, non-expired NFT passes
    const now = new Date().toISOString();
    const { data: stakedNfts } = await supabase
      .from("nft_passes")
      .select("id, owner_wallet, is_simulated")
      .eq("is_staked", true)
      .gt("expires_at", now);

    if (!stakedNfts || stakedNfts.length === 0) {
      return new Response(JSON.stringify({ status: "skip", reason: "no stakers" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const perNft = hourlyPayout / stakedNfts.length;

    // 3. Create distribution record
    const { data: dist } = await supabase
      .from("reward_distributions")
      .insert({
        total_distributed: hourlyPayout,
        num_recipients: stakedNfts.length,
        per_nft_amount: perNft,
      })
      .select("id")
      .single();

    // 4. Create individual claims
    const claims = stakedNfts.map((nft) => ({
      distribution_id: dist!.id,
      nft_pass_id: nft.id,
      wallet: nft.is_simulated ? TREASURY_WALLET : nft.owner_wallet,
      amount: perNft,
      is_simulated: nft.is_simulated,
    }));

    await supabase.from("reward_claims").insert(claims);

    // 5. Deduct from pool
    await supabase
      .from("reward_pool")
      .update({
        total_balance: pool.total_balance - hourlyPayout,
        last_distribution: now,
      })
      .eq("id", pool.id);

    return new Response(
      JSON.stringify({
        status: "ok",
        distributed: hourlyPayout,
        recipients: stakedNfts.length,
        per_nft: perNft,
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
