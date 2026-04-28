/**
 * Minimal Deno + remote-import type stubs so `npx tsc --noEmit` can validate
 * Supabase Edge Functions locally without a Deno toolchain. The runtime is
 * still Deno on Supabase — these declarations only satisfy the TS compiler.
 */

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
    has(key: string): boolean;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const env: Env;
}

// ── Remote URL module shims ───────────────────────────────────────────
// These mirror the public surface used by our edge functions. The full
// type packages live on jsr.io / npm; we only declare what's imported.

declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export type ServeHandler = (
    req: Request,
    info?: unknown
  ) => Response | Promise<Response>;
  export function serve(handler: ServeHandler): void;
  export function serve(
    options: { port?: number; hostname?: string },
    handler: ServeHandler
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export type SupabaseClient = import("@supabase/supabase-js").SupabaseClient;
  export const createClient: typeof import("@supabase/supabase-js").createClient;
}

declare module "https://esm.sh/@solana/web3.js@1.95.3" {
  export type Connection = import("@solana/web3.js").Connection;
  export const Connection: typeof import("@solana/web3.js").Connection;
  export type PublicKey = import("@solana/web3.js").PublicKey;
  export const PublicKey: typeof import("@solana/web3.js").PublicKey;
}
