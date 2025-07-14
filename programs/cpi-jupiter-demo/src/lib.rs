#![allow(unexpected_cfgs)]

use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::token::spl_token;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

declare_id!("APcSMSU2aQknYMaBMwMNGhiqZEQWkWE8TrVEdBpz3ZmG");

declare_program!(jupiter_aggregator);

#[program]
pub mod cpi_jupiter_demo {
    use super::*;

    #[derive(Accounts)]
    pub struct SwapByUser {}
    pub fn swap_by_user(ctx: Context<SwapByUser>, data: Vec<u8>) -> Result<()> {
        // Solana -> EVM, swap on solana side i.e. swap before bridge
        // so the input token is paid by the user directly
        let accounts: Vec<AccountMeta> = ctx
            .remaining_accounts
            .iter()
            .map(|acc| AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.is_signer,
                is_writable: acc.is_writable,
            })
            .collect();

        let accounts_infos: Vec<AccountInfo> = ctx
            .remaining_accounts
            .iter()
            .map(|acc| AccountInfo { ..acc.clone() })
            .collect();

        invoke_signed(
            &Instruction {
                program_id: jupiter_aggregator::ID,
                accounts,
                data,
            },
            &accounts_infos,
            &[],
        )?;
        Ok(())
    }

    const VAULT_SEED: &[u8] = b"vault";

    // Wrapped SOL mint address
    const WSOL_MINT: &str = "So11111111111111111111111111111111111111112";

    #[derive(Accounts)]
    pub struct InitializeVault<'info> {
        #[account(mut, signer)]
        pub payer: Signer<'info>,

        #[account(
            init_if_needed,
            payer = payer,
            space = 8,
            seeds = [VAULT_SEED],
            bump,
        )]
        /// CHECK: Program-derived vault (empty — we only need its address & bump)
        pub vault_pda: UncheckedAccount<'info>,

        pub input_token_mint: Box<Account<'info, Mint>>,
        pub output_token_mint: Box<Account<'info, Mint>>,

        // The associated token account that we are about to create.
        // Anchor will throw if it already exists, so mark it as `init_if_needed`.
        #[account(
            init_if_needed,
            payer = payer,
            associated_token::mint = input_token_mint,
            associated_token::authority = vault_pda,
        )]
        pub vault_input_ata: Box<Account<'info, TokenAccount>>,

        #[account(
            init_if_needed,
            payer = payer,
            associated_token::mint = output_token_mint,
            associated_token::authority = vault_pda,
        )]
        pub vault_output_ata: Box<Account<'info, TokenAccount>>,

        pub system_program: Program<'info, System>,
        pub token_program: Program<'info, Token>,
        pub associated_token_program: Program<'info, AssociatedToken>,
    }
    pub fn initialize_vault(ctx: Context<InitializeVault>, amount: u64) -> Result<()> {
        // this function is used to topup the vault with the input token
        // it's for simulation of the production situation when the vault
        // is already topped up with the input token

        // Check if the input token is SOL (wSOL mint)
        if ctx.accounts.input_token_mint.key().to_string() == WSOL_MINT {
            // Transfer SOL from payer to vault PDA
            let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.payer.key(),
                &ctx.accounts.vault_pda.key(),
                amount,
            );

            anchor_lang::solana_program::program::invoke(
                &transfer_ix,
                &[
                    ctx.accounts.payer.to_account_info(),
                    ctx.accounts.vault_pda.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            // Wrap SOL to wSOL
            let wrap_ix = spl_token::instruction::sync_native(
                &spl_token::id(),
                &ctx.accounts.vault_input_ata.key(),
            )?;

            invoke_signed(
                &wrap_ix,
                &[
                    ctx.accounts.vault_input_ata.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                ],
                &[&[VAULT_SEED, &[ctx.bumps.vault_pda]]],
            )?;

            msg!(
                "Successfully transferred {} SOL from payer and wrapped to wSOL",
                amount
            );

            let transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.payer.key(),
                &ctx.accounts.vault_pda.key(),
                amount,
            );

            anchor_lang::solana_program::program::invoke(
                &transfer_ix,
                &[
                    ctx.accounts.payer.to_account_info(),
                    ctx.accounts.vault_pda.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        Ok(())
    }

    #[derive(Accounts)]
    pub struct SwapByProgram<'info> {
        pub input_token_mint: Account<'info, Mint>,
    }
    pub fn swap_by_program(ctx: Context<SwapByProgram>, data: Vec<u8>) -> Result<()> {
        // EVM -> Solana, swap on solana side i.e. swap after bridge
        // the relayer will transfer the input token to the program
        // so the input token is paid by the program

        // Derive the vault PDA for this program (one vault for all tokens)
        let (vault_pda, _bump) = Pubkey::find_program_address(&[VAULT_SEED], ctx.program_id);
        msg!("vault_pda: {}", vault_pda.to_string());

        let accounts: Vec<AccountMeta> = ctx
            .remaining_accounts
            .iter()
            .map(|acc| AccountMeta {
                pubkey: *acc.key,
                is_signer: acc.key.to_string() == vault_pda.to_string(),
                is_writable: acc.is_writable,
            })
            .collect();

        let accounts_infos: Vec<AccountInfo> = ctx
            .remaining_accounts
            .iter()
            .map(|acc| AccountInfo { ..acc.clone() })
            .collect();

        invoke_signed(
            &Instruction {
                program_id: jupiter_aggregator::ID,
                accounts,
                data,
            },
            &accounts_infos,
            &[&[VAULT_SEED, &[_bump]]],
        )?;
        Ok(())
    }
}
