import * as anchor from "@coral-xyz/anchor";
import { CpiJupiterDemo } from "../target/types/cpi_jupiter_demo";
import { Program } from "@coral-xyz/anchor";

import { swap } from "./helpers/swap";
import { USDC_MINT, WSOL_MINT } from "../app/utils/constants";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token"
import { assert } from "chai";




describe("cpi-jupiter-demo", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const wallet = provider.wallet;
  const program = anchor.workspace.cpiJupiterDemo as Program<CpiJupiterDemo>;

  it("Can perform a swap via CPI", async () => {

    // get SOL and USDC balance of the wallet before the swap
    const solBalanceBefore = await provider.connection.getBalance(wallet.publicKey);

    const usdcTokenAccount = await getAssociatedTokenAddress(new PublicKey(USDC_MINT), wallet.publicKey);
    const usdcBalanceBefore = await provider.connection.getTokenAccountBalance(usdcTokenAccount);

    const inputAmount = 0.01 * LAMPORTS_PER_SOL
    await swap(program, WSOL_MINT, USDC_MINT, inputAmount)

    // get SOL and USDC balance of the wallet after the swap
    const solBalanceAfter = await provider.connection.getBalance(wallet.publicKey);
    const usdcBalanceAfter = await provider.connection.getTokenAccountBalance(usdcTokenAccount);

    // compare the balances in human readable format
    // console.log(`swapped ${(solBalanceBefore - solBalanceAfter) / LAMPORTS_PER_SOL} SOL for ${usdcBalanceAfter.value.uiAmount - usdcBalanceBefore.value.uiAmount} USDC`)


    // 1% tolerance
    assert.approximately(solBalanceBefore - solBalanceAfter, inputAmount, 0.01 * inputAmount);
    assert.isAbove(usdcBalanceAfter.value.uiAmount - usdcBalanceBefore.value.uiAmount, 1);

  });
});
