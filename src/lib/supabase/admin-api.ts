/**
 * ADMIN-ONLY Supabase client. Reads raw tables (nodes / nft_passes) and
 * returns admin-only columns (`simulated_slots`, `is_simulated`).
 *
 * SECURITY MODEL
 * ──────────────
 * Migration 002 revokes anon SELECT on `nodes` and `nft_passes`. This module
 * therefore ONLY works when the underlying Supabase client is authenticated
 * with the service-role key (Edge Function context) or via a session that
 * has been granted admin privileges via RLS.
 *
 * In the browser admin shell (`src/app/admin/page.tsx`), today's deploy uses
 * the bundled anon key — which means these fetchers will return empty lists.
 * This is INTENTIONAL: it means the admin UI degrades to "empty" rather than
 * accidentally serving admin data to the public during the alpha period.
 *
 * BEFORE THE ADMIN UI GOES LIVE
 * ─────────────────────────────
 *  - Add a `/api/admin/*` Next.js Route Handler that uses
 *    `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` on the server.
 *  - Gate that route with a session check (NextAuth, Clerk, or wallet-sig).
 *  - Replace these client-side imports with `fetch('/api/admin/nodes')`.
 *
 * Do NOT bundle the service-role key into the client. Ever.
 *
 * Related: GAPS.md §5 action item 5 — confirm /admin is either gated or 404'd.
 */
import { supabase, isSupabaseConnected } from "./client";
import { MOCK_NODES, MOCK_NFTS } from "@/lib/mock-data";

// Admin types EXTEND the public types with admin-only columns. Keep these
// imports/exports separate from `./api.ts` so a stray admin import in a
// non-admin component is easy to spot in code review.
export interface AdminNodeRow {
  id: string;
  owner_wallet: string;
  device_model: string;
  status: "live" | "offline";
  total_slots: number;
  used_slots: number;
  simulated_slots: number; // admin-only — locked from anon by migration 002
  registered_at: string;
}

export interface AdminNftRow {
  id: string;
  owner_wallet: string;
  mint_index: number;
  tier: number;
  mint_price: number;
  minted_at: string;
  expires_at: string;
  staked_on: string | null;
  is_staked: boolean;
  is_simulated: boolean; // admin-only — locked from anon by migration 002
}

// ── Admin fetchers ────────────────────────────────────────
// Hit raw tables (not the public views). Will return [] under anon key.
export async function fetchAdminNodes(): Promise<AdminNodeRow[]> {
  if (!isSupabaseConnected) {
    // Mock path for local dev. In real life this returns empty under anon
    // because migration 002 revoked SELECT on `nodes`.
    return MOCK_NODES.map((n) => ({
      id: n.id,
      owner_wallet: n.owner_wallet,
      device_model: n.device_model,
      status: n.status,
      total_slots: n.total_slots,
      used_slots: n.used_slots,
      simulated_slots: 0, // mock-data is public-shape; admin sim count starts at 0
      registered_at: n.registered_at,
    }));
  }

  const { data, error } = await supabase
    .from("nodes")
    .select(
      "id, owner_wallet, device_model, status, total_slots, used_slots, simulated_slots, registered_at"
    )
    .order("registered_at", { ascending: false });

  if (error) {
    // Anon will hit this branch: PostgREST returns 401/403 because the GRANT
    // was revoked. Return [] so the admin UI degrades gracefully.
    console.warn("[admin-api] fetchAdminNodes failed (expected without service-role):", error.message);
    return [];
  }
  return data || [];
}

export async function fetchAdminNftPasses(wallet?: string): Promise<AdminNftRow[]> {
  if (!isSupabaseConnected) {
    let nfts = MOCK_NFTS;
    if (wallet) nfts = nfts.filter((n) => n.owner_wallet === wallet);
    return nfts.map((n) => ({
      id: n.id,
      owner_wallet: n.owner_wallet,
      mint_index: n.tier,
      tier: n.tier,
      mint_price: n.mint_price_sight,
      minted_at: n.minted_at,
      expires_at: n.expires_at,
      staked_on: n.staked_on_node,
      is_staked: n.staked_on_node !== null,
      is_simulated: false, // mock-data is public-shape; admin marks specific ones manually
    }));
  }

  let query = supabase
    .from("nft_passes")
    .select(
      "id, owner_wallet, mint_index, tier, mint_price, minted_at, expires_at, staked_on, is_staked, is_simulated"
    )
    .order("minted_at", { ascending: false });

  if (wallet) query = query.eq("owner_wallet", wallet);

  const { data, error } = await query;
  if (error) {
    console.warn("[admin-api] fetchAdminNftPasses failed (expected without service-role):", error.message);
    return [];
  }
  return data || [];
}
