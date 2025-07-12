import axios from "axios"
import { debug } from "./debug"

// https://dev.jup.ag/docs/api/swap-api/quote
export const callQuote = async (inputMint: string, outputMint: string, amount: number = 10000000, slippageBps: number = 100) => {
    const quote = await axios.get("https://lite-api.jup.ag/swap/v1/quote", {
        params: {
            inputMint,
            outputMint,
            amount,
            slippageBps,
            dexes: "PancakeSwap"
        }
    })
    // Debug logging
    debug("/////////////// /quote ///////////////");
    debug("Quote data:", JSON.stringify(quote.data, null, 2));
    debug("\n\n\n");
    return quote.data
}

// https://dev.jup.ag/docs/api/swap-api/swap-instructions
export const callSwapInstruction = async (userPublicKey: string, quoteResponse) => {
    const swap = await axios.post("https://lite-api.jup.ag/swap/v1/swap-instructions", {
        userPublicKey,
        quoteResponse,
    })
    // Debug logging
    debug("/////////////// /swap-instructions ///////////////");
    debug("Swap data:", JSON.stringify(swap.data, null, 2));
    debug("\n\n\n");
    return swap.data
}


