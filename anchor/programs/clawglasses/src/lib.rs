use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// ─── Constants ───────────────────────────────────────────────
const MAX_SLOTS_PER_NODE: u16 = 20;
const NFT_PASS_DURATION_SECS: i64 = 30 * 24 * 60 * 60; // 30 days
const REWARD_POOL_SHARE_BPS: u64 = 6000; // 60%
const TREASURY_SHARE_BPS: u64 = 4000;    // 40%
const BPS_DENOMINATOR: u64 = 10000;

// Bonding curve: tier index → (max cumulative supply, price in $SIGHT base units)
// $SIGHT has 9 decimals
const BONDING_TIERS: [(u32, u64); 5] = [
    (500,   100_000_000_000),  // Tier 1: 0–500     → 100 $SIGHT
    (1000,  150_000_000_000),  // Tier 2: 501–1000   → 150 $SIGHT
    (2000,  225_000_000_000),  // Tier 3: 1001–2000  → 225 $SIGHT
    (5000,  340_000_000_000),  // Tier 4: 2001–5000  → 340 $SIGHT
    (10000, 500_000_000_000),  // Tier 5: 5001–10000 → 500 $SIGHT
];

#[program]
pub mod clawglasses {
    use super::*;

    // ─── Initialize global config (once) ─────────────────────
    pub fn initialize(ctx: Context<Initialize>, treasury: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = treasury;
        config.sight_mint = ctx.accounts.sight_mint.key();
        config.total_nodes = 0;
        config.total_nfts_minted = 0;
        config.total_nfts_staked = 0;
        config.reward_pool_balance = 0;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    // ─── Register a hardware node ────────────────────────────
    pub fn register_node(ctx: Context<RegisterNode>, device_model: String) -> Result<()> {
        require!(device_model.len() <= 8, ClawError::ModelTooLong);

        let node = &mut ctx.accounts.node;
        node.owner = ctx.accounts.owner.key();
        node.device_model = device_model;
        node.total_slots = MAX_SLOTS_PER_NODE;
        node.used_slots = 0;
        node.simulated_slots = 0;
        node.status = NodeStatus::Live;
        node.registered_at = Clock::get()?.unix_timestamp;
        node.bump = ctx.bumps.node;

        let config = &mut ctx.accounts.config;
        config.total_nodes += 1;

        Ok(())
    }

    // ─── Mint an NFT Pass (burns $SIGHT, splits to pool+treasury) ──
    pub fn mint_nft_pass(ctx: Context<MintNftPass>) -> Result<()> {
        let config = &mut ctx.accounts.config;

        // Determine price from bonding curve
        let price = get_tier_price(config.total_nfts_minted)?;
        let reward_amount = price * REWARD_POOL_SHARE_BPS / BPS_DENOMINATOR;
        let treasury_amount = price * TREASURY_SHARE_BPS / BPS_DENOMINATOR;

        // Transfer $SIGHT from buyer → reward pool ATA
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_sight_ata.to_account_info(),
                    to: ctx.accounts.reward_pool_ata.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            reward_amount,
        )?;

        // Transfer $SIGHT from buyer → treasury ATA
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_sight_ata.to_account_info(),
                    to: ctx.accounts.treasury_sight_ata.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            treasury_amount,
        )?;

        // Create NFT pass account
        let nft_pass = &mut ctx.accounts.nft_pass;
        nft_pass.owner = ctx.accounts.buyer.key();
        nft_pass.mint_index = config.total_nfts_minted;
        nft_pass.mint_price = price;
        nft_pass.minted_at = Clock::get()?.unix_timestamp;
        nft_pass.expires_at = nft_pass.minted_at + NFT_PASS_DURATION_SECS;
        nft_pass.staked_node = Pubkey::default();
        nft_pass.is_staked = false;
        nft_pass.is_simulated = false;
        nft_pass.bump = ctx.bumps.nft_pass;

        config.total_nfts_minted += 1;
        config.reward_pool_balance += reward_amount;

        emit!(NftMinted {
            owner: nft_pass.owner,
            mint_index: nft_pass.mint_index,
            price,
            tier: get_tier_index(nft_pass.mint_index),
        });

        Ok(())
    }

    // ─── Stake NFT Pass on a node ────────────────────────────
    pub fn stake_nft(ctx: Context<StakeNft>) -> Result<()> {
        let nft_pass = &mut ctx.accounts.nft_pass;
        let node = &mut ctx.accounts.node;
        let config = &mut ctx.accounts.config;

        require!(!nft_pass.is_staked, ClawError::AlreadyStaked);
        require!(node.status == NodeStatus::Live, ClawError::NodeOffline);
        require!(node.used_slots < node.total_slots, ClawError::NoFreeSlots);
        require!(
            Clock::get()?.unix_timestamp < nft_pass.expires_at,
            ClawError::NftExpired
        );

        nft_pass.is_staked = true;
        nft_pass.staked_node = node.key();
        node.used_slots += 1;
        config.total_nfts_staked += 1;

        emit!(NftStaked {
            nft_index: nft_pass.mint_index,
            node: node.key(),
            slot: node.used_slots,
        });

        Ok(())
    }

    // ─── Unstake NFT Pass ────────────────────────────────────
    pub fn unstake_nft(ctx: Context<UnstakeNft>) -> Result<()> {
        let nft_pass = &mut ctx.accounts.nft_pass;
        let node = &mut ctx.accounts.node;
        let config = &mut ctx.accounts.config;

        require!(nft_pass.is_staked, ClawError::NotStaked);
        require!(nft_pass.staked_node == node.key(), ClawError::WrongNode);

        nft_pass.is_staked = false;
        nft_pass.staked_node = Pubkey::default();
        node.used_slots = node.used_slots.saturating_sub(1);
        config.total_nfts_staked = config.total_nfts_staked.saturating_sub(1);

        Ok(())
    }

    // ─── Distribute rewards (admin/cron) ─────────────────────
    pub fn distribute_rewards(ctx: Context<DistributeRewards>, amount_per_nft: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(
            ctx.accounts.authority.key() == config.authority,
            ClawError::Unauthorized
        );

        // The actual distribution happens off-chain (cron reads staked NFTs,
        // builds a batch transfer). This instruction just logs the event
        // and could be extended to do on-chain batch transfers via remaining_accounts.
        emit!(RewardsDistributed {
            total_staked: config.total_nfts_staked,
            amount_per_nft,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ─── Admin: add simulated stakes ─────────────────────────
    pub fn add_simulated_stakes(ctx: Context<AdminNodeAction>, count: u16) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(
            ctx.accounts.authority.key() == config.authority,
            ClawError::Unauthorized
        );

        let node = &mut ctx.accounts.node;
        let available = node.total_slots - node.used_slots;
        require!(count <= available, ClawError::NoFreeSlots);

        node.used_slots += count;
        node.simulated_slots += count;

        Ok(())
    }

    // ─── Admin: remove simulated stakes ──────────────────────
    pub fn remove_simulated_stakes(ctx: Context<AdminNodeAction>, count: u16) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(
            ctx.accounts.authority.key() == config.authority,
            ClawError::Unauthorized
        );

        let node = &mut ctx.accounts.node;
        let to_remove = count.min(node.simulated_slots);

        node.used_slots = node.used_slots.saturating_sub(to_remove);
        node.simulated_slots = node.simulated_slots.saturating_sub(to_remove);

        Ok(())
    }

    // ─── Admin: set node status ──────────────────────────────
    pub fn set_node_status(ctx: Context<AdminNodeAction>, status: NodeStatus) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(
            ctx.accounts.authority.key() == config.authority,
            ClawError::Unauthorized
        );
        ctx.accounts.node.status = status;
        Ok(())
    }
}

// ─── Helpers ─────────────────────────────────────────────────
fn get_tier_price(total_minted: u32) -> Result<u64> {
    for &(max_supply, price) in &BONDING_TIERS {
        if total_minted < max_supply {
            return Ok(price);
        }
    }
    Err(error!(ClawError::MaxSupplyReached))
}

fn get_tier_index(mint_index: u32) -> u8 {
    for (i, &(max_supply, _)) in BONDING_TIERS.iter().enumerate() {
        if mint_index < max_supply {
            return (i + 1) as u8;
        }
    }
    BONDING_TIERS.len() as u8
}

// ─── Accounts ────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, Config>,
    pub sight_mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterNode<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Node::INIT_SPACE,
        seeds = [b"node", owner.key().as_ref(), &config.total_nodes.to_le_bytes()],
        bump,
    )]
    pub node: Account<'info, Node>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintNftPass<'info> {
    #[account(
        init,
        payer = buyer,
        space = 8 + NftPass::INIT_SPACE,
        seeds = [b"nft_pass", &(config.total_nfts_minted as u64).to_le_bytes()],
        bump,
    )]
    pub nft_pass: Account<'info, NftPass>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = sight_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_sight_ata: Account<'info, TokenAccount>,
    /// CHECK: reward pool PDA — in production, a PDA owned by this program
    #[account(mut)]
    pub reward_pool_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_sight_ata: Account<'info, TokenAccount>,
    pub sight_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeNft<'info> {
    #[account(mut, has_one = owner @ ClawError::Unauthorized)]
    pub nft_pass: Account<'info, NftPass>,
    #[account(mut)]
    pub node: Account<'info, Node>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnstakeNft<'info> {
    #[account(mut, has_one = owner @ ClawError::Unauthorized)]
    pub nft_pass: Account<'info, NftPass>,
    #[account(mut)]
    pub node: Account<'info, Node>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminNodeAction<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub node: Account<'info, Node>,
    pub authority: Signer<'info>,
}

// ─── State ───────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,          // 32
    pub treasury: Pubkey,           // 32
    pub sight_mint: Pubkey,         // 32
    pub total_nodes: u32,           // 4
    pub total_nfts_minted: u32,     // 4
    pub total_nfts_staked: u32,     // 4
    pub reward_pool_balance: u64,   // 8
    pub bump: u8,                   // 1
}

#[account]
#[derive(InitSpace)]
pub struct Node {
    pub owner: Pubkey,              // 32
    #[max_len(8)]
    pub device_model: String,       // 4 + 8
    pub total_slots: u16,           // 2
    pub used_slots: u16,            // 2
    pub simulated_slots: u16,       // 2
    pub status: NodeStatus,         // 1
    pub registered_at: i64,         // 8
    pub bump: u8,                   // 1
}

#[account]
#[derive(InitSpace)]
pub struct NftPass {
    pub owner: Pubkey,              // 32
    pub mint_index: u32,            // 4
    pub mint_price: u64,            // 8
    pub minted_at: i64,             // 8
    pub expires_at: i64,            // 8
    pub staked_node: Pubkey,        // 32
    pub is_staked: bool,            // 1
    pub is_simulated: bool,         // 1
    pub bump: u8,                   // 1
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum NodeStatus {
    Live,
    Offline,
}

// ─── Events ──────────────────────────────────────────────────

#[event]
pub struct NftMinted {
    pub owner: Pubkey,
    pub mint_index: u32,
    pub price: u64,
    pub tier: u8,
}

#[event]
pub struct NftStaked {
    pub nft_index: u32,
    pub node: Pubkey,
    pub slot: u16,
}

#[event]
pub struct RewardsDistributed {
    pub total_staked: u32,
    pub amount_per_nft: u64,
    pub timestamp: i64,
}

// ─── Errors ──────────────────────────────────────────────────

#[error_code]
pub enum ClawError {
    #[msg("Not authorized")]
    Unauthorized,
    #[msg("Device model name too long (max 8 chars)")]
    ModelTooLong,
    #[msg("NFT pass already staked")]
    AlreadyStaked,
    #[msg("NFT pass not staked")]
    NotStaked,
    #[msg("Node is offline")]
    NodeOffline,
    #[msg("No free slots on this node")]
    NoFreeSlots,
    #[msg("NFT pass has expired")]
    NftExpired,
    #[msg("Wrong node for this NFT")]
    WrongNode,
    #[msg("Max NFT supply reached")]
    MaxSupplyReached,
}
