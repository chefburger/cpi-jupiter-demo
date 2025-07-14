import * as anchor from "@coral-xyz/anchor";
import { CpiJupiterDemo } from "../target/types/cpi_jupiter_demo";
import { Program } from "@coral-xyz/anchor";

import { swapByUser, swapByProgram } from "./helpers/swap";
import { USDC_MINT, WSOL_MINT } from "../app/utils/constants";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token"
import { assert } from "chai";
import { debug } from "../app/utils/debug";




describe("cpi-jupiter-demo", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const wallet = provider.wallet;
  const program = anchor.workspace.cpiJupiterDemo as Program<CpiJupiterDemo>;

  it("perform a swap paid by the user", async () => {

    // get wSOL and USDC balance of the wallet before the swap
    const wsolTokenAccount = await getAssociatedTokenAddress(new PublicKey(WSOL_MINT), wallet.publicKey);
    const wsolBalanceBefore = await provider.connection.getTokenAccountBalance(wsolTokenAccount);

    const usdcTokenAccount = await getAssociatedTokenAddress(new PublicKey(USDC_MINT), wallet.publicKey);
    const usdcBalanceBefore = await provider.connection.getTokenAccountBalance(usdcTokenAccount);

    const inputAmount = 0.01 * LAMPORTS_PER_SOL
    const hash = await swapByUser(program, WSOL_MINT, USDC_MINT, inputAmount)
    const tx = await provider.connection.getTransaction(hash, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    debug("tx: ", JSON.stringify(tx, null, 2))


    // get SOL and USDC balance of the wallet after the swap
    const wsolBalanceAfter = await provider.connection.getTokenAccountBalance(wsolTokenAccount);
    const usdcBalanceAfter = await provider.connection.getTokenAccountBalance(usdcTokenAccount);


    assert.equal(wsolBalanceAfter.value.uiAmount, 0);
    assert.equal(wsolBalanceAfter.value.uiAmount, wsolBalanceBefore.value.uiAmount);
    // as long as sol price is above 130
    assert.isAbove(usdcBalanceAfter.value.uiAmount - usdcBalanceBefore.value.uiAmount, 1.3);

  });


  it("perform a swap paid by the program", async () => {


    // derive the program's vault addr
    const vaultPda = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId)[0];
    // and then the ata of the program's vault
    const vaultAta = await getAssociatedTokenAddress(new PublicKey(USDC_MINT), vaultPda, true);
    const usdcBalanceBefore = await provider.connection.getTokenAccountBalance(vaultAta);

    const inputAmount = 0.01 * LAMPORTS_PER_SOL
    await swapByProgram(program, WSOL_MINT, USDC_MINT, inputAmount)

    const usdcBalanceAfter = await provider.connection.getTokenAccountBalance(vaultAta);
    // as long as sol price is above 130
    assert.isAbove(usdcBalanceAfter.value.uiAmount - usdcBalanceBefore.value.uiAmount, 1.3);
  });
});
