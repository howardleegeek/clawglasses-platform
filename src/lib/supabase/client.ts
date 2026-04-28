import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Supabase client — returns a mock-safe instance.
 * When env vars are empty, all queries return empty arrays (mock mode).
 */
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient<Database>(supabaseUrl, supabaseKey)
    : (null as any);

export const isSupabaseConnected = Boolean(supabaseUrl && supabaseKey);
