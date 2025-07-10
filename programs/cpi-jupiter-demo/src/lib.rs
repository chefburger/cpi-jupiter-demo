#![allow(unexpected_cfgs)]

use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};

declare_id!("APcSMSU2aQknYMaBMwMNGhiqZEQWkWE8TrVEdBpz3ZmG");

declare_program!(jupiter_aggregator);

#[program]
pub mod cpi_jupiter_demo {

    use super::*;

    pub fn swap(ctx: Context<Swap>, data: Vec<u8>) -> Result<()> {
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
}

#[derive(Accounts)]
pub struct Swap {}
