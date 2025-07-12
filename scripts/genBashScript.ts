import { USDC_MINT, WSOL_MINT } from "../app/utils/constants";
import { callQuote, callSwapInstruction } from "../app/utils/apis";


// accounts to exclude from the validator clone
const list = [
    // sysvar instructions
    "Sysvar1nstructions1111111111111111111111111"
]



const main = async (userPublicKey: string, inputMint: string, outputMint: string) => {
    const quote = await callQuote(inputMint, outputMint)
    const swapInstructionsRaw = await callSwapInstruction(userPublicKey, quote)

    const clonedAccounts = swapInstructionsRaw.swapInstruction.accounts.filter(account => !list.includes(account.pubkey)).map(account => account.pubkey);

    console.log("solana-test-validator --url https://api.mainnet-beta.solana.com --clone " + clonedAccounts.join(" --clone ")
        + " --reset"
        + " --bpf-program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4  ./scripts/binary/jupiter.so"
        + " --bpf-program LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo ./scripts/binary/meteora.so"
        + " --bpf-program HpNfyc2Saw7RKkQd8nEL4khUcuPhQ7WwY1B2qjx8jxFq ./scripts/binary/pcsclmm.so"
        + " -q &"
    )
}

main("CQyLJnhNoqqTnYhRNLdVsSWonEMDcnLD5bEYxTHNt3Nv", WSOL_MINT, USDC_MINT)