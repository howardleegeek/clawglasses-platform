/**
 * Supabase Database types — matches the SQL schema in migrations/001.
 * In production, generate with: npx supabase gen types typescript
 */

export interface Database {
  public: {
    Tables: {
      nodes: {
        Row: {
          id: string;
          owner_wallet: string;
          device_model: "WG1" | "WG2";
          onchain_pda: string | null;
          status: "live" | "offline";
          total_slots: number;
          used_slots: number;
          simulated_slots: number;
          registered_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["nodes"]["Row"], "id" | "registered_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["nodes"]["Insert"]>;
      };
      nft_passes: {
        Row: {
          id: string;
          owner_wallet: string;
          mint_index: number;
          onchain_pda: string | null;
          tier: number;
          mint_price: number;
          tx_signature: string | null;
          minted_at: string;
          expires_at: string;
          staked_on: string | null;
          is_staked: boolean;
          is_simulated: boolean;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["nft_passes"]["Row"], "id" | "minted_at" | "expires_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["nft_passes"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          buyer_wallet: string;
          product_key: "WG1" | "WG2";
          price: number;
          pay_token: "USDC" | "USDT";
          tx_signature: string | null;
          shipping_name: string | null;
          shipping_email: string | null;
          shipping_address: string | null;
          status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      reward_pool: {
        Row: {
          id: string;
          total_balance: number;
          last_distribution: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: Partial<{ total_balance: number; last_distribution: string }>;
      };
      reward_distributions: {
        Row: {
          id: string;
          total_distributed: number;
          num_recipients: number;
          per_nft_amount: number;
          distributed_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reward_distributions"]["Row"], "id" | "distributed_at">;
        Update: never;
      };
      reward_claims: {
        Row: {
          id: string;
          distribution_id: string;
          nft_pass_id: string;
          wallet: string;
          amount: number;
          is_simulated: boolean;
          tx_signature: string | null;
          claimed_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reward_claims"]["Row"], "id" | "claimed_at">;
        Update: Partial<{ tx_signature: string }>;
      };
    };
    Views: {
      v_network_stats: {
        Row: {
          nodes_online: number;
          total_slots: number;
          used_slots: number;
          simulated_slots: number;
          total_nfts: number;
          staked_nfts: number;
          reward_pool_balance: number;
          nft_slot_ratio: number;
        };
      };
    };
  };
}
