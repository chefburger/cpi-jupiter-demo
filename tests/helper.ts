import axios from "axios"

import {
    PublicKey,
    AddressLookupTableAccount,
    TransactionInstruction,
    VersionedTransaction,
    TransactionMessage,
} from "@solana/web3.js";


// https://dev.jup.ag/docs/api/swap-api/quote
const callQuote = async () => {
    const quote = await axios.get("https://lite-api.jup.ag/swap/v1/quote", {
        params: {
            // wSOL
            inputMint: "So11111111111111111111111111111111111111112",
            // USDC
            outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            // 0.01 SOL
            amount: 10000000,
            slippageBps: 100,
        }
    })
    // console.log("/////////////// /quote ///////////////")
    // console.log(quote.data)
    // console.log("\n\n\n")
    return quote.data
}

// https://dev.jup.ag/docs/api/swap-api/swap-instructions
const callSwapInstruction = async (userPublicKey, quote) => {
    const swap = await axios.post("https://lite-api.jup.ag/swap/v1/swap-instructions", {
        userPublicKey: userPublicKey,
        quoteResponse: quote,
    })
    console.log("/////////////// /swap-instructions ///////////////")
    console.log(JSON.stringify(swap.data, null, 2))
    console.log("\n\n\n")
    return swap.data
}


const toTransactionInstruction = (
    instructionPayload
) => {
    return new TransactionInstruction({
        programId: new PublicKey(instructionPayload.programId),
        keys: instructionPayload.accounts.map((key) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
        })),
        data: Buffer.from(instructionPayload.data, "base64"),
    });
}

const addressesToAlt = async (connection, keys) => {
    const addressLookupTableAccountInfos =
        await connection.getMultipleAccountsInfo(
            keys.map((key) => new PublicKey(key))
        );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
        const addressLookupTableAddress = keys[index];
        if (accountInfo) {
            const addressLookupTableAccount = new AddressLookupTableAccount({
                key: new PublicKey(addressLookupTableAddress),
                state: AddressLookupTableAccount.deserialize(accountInfo.data),
            });
            acc.push(addressLookupTableAccount);
        }

        return acc;
    }, new Array<AddressLookupTableAccount>());
}

export const executeSwap = async (program, wallet, provider) => {
    const quote = await callQuote()
    const swapInstructionsRaw = await callSwapInstruction(wallet.publicKey.toString(), quote)
    const swapInstruction = toTransactionInstruction(swapInstructionsRaw.swapInstruction)

    const instructions = [
        // TODO: is this needed?
        ...swapInstructionsRaw.computeBudgetInstructions.map(toTransactionInstruction),
        await program.methods
            .swap(swapInstruction.data)
            .accounts({})
            .remainingAccounts(swapInstruction.keys)
            .instruction(),
    ];



    const blockhash = (await provider.connection.getLatestBlockhash()).blockhash;

    // If you want, you can add more lookup table accounts here
    const addressLookupTableAccounts = await addressesToAlt(
        provider.connection,
        swapInstructionsRaw.addressLookupTableAddresses
    );
    const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions,
    }).compileToV0Message(addressLookupTableAccounts);
    const transaction = new VersionedTransaction(messageV0);
    const tx = await provider.sendAndConfirm(transaction, [wallet.payer]);
    console.log(tx)
}
