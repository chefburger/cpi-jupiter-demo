import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CpiJupiterDemo } from "../target/types/cpi_jupiter_demo";
import { PublicKey } from "@solana/web3.js";
import { executeSwap } from "./helper";

describe("cpi-jupiter-demo", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.cpiJupiterDemo as Program<CpiJupiterDemo>;

  // Jupiter Aggregator program ID (mainnet)
  const JUPITER_AGGREGATOR_PROGRAM_ID = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

  it("Can perform a swap via CPI", async () => {
    // This test will work with the forked mainnet state
    // You can add specific swap logic here once you have the forked environment running

    console.log("Jupiter Aggregator Program ID:", JUPITER_AGGREGATOR_PROGRAM_ID.toString());
    console.log("Your program ID:", program.programId.toString());

    // Example: await program.methods.swap(swapData).accounts({...}).rpc();

    // CQyLJnhNoqqTnYhRNLdVsSWonEMDcnLD5bEYxTHNt3Nv
    const wallet = anchor.getProvider().wallet;
    const provider = anchor.getProvider();

    await executeSwap(program, wallet, provider);
  });
});
