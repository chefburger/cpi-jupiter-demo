import axios from "axios"
import * as fs from "fs"
import * as path from "path"

import {
    PublicKey,
    Keypair,
    Connection,
    AddressLookupTableAccount,
    TransactionInstruction,
    VersionedTransaction,
    TransactionMessage,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, NATIVE_MINT } from "@solana/spl-token";
import IDL from "../target/idl/cpi_jupiter_demo.json";

// load the default Solana keypair from ~/.config/solana/id.json
const loadKeypair = (): Keypair => {
    const home = process.env.HOME;
    const keypairPath = path.join(home!, '.config', 'solana', 'id.json');

    if (!fs.existsSync(keypairPath)) {
        throw new Error(`Solana keypair not found at ${keypairPath}. Please run 'solana-keygen new' to create one.`);
    }

    const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
    console.log("/////////////// keypair ///////////////")
    console.log(keypair.publicKey.toBase58())
    console.log("\n\n\n")
    return keypair
};

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
    console.log("/////////////// /quote ///////////////")
    console.log(quote.data)
    console.log("\n\n\n")
    return quote.data
}

// https://dev.jup.ag/docs/api/swap-api/swap-instructions
const callSwapInstruction = async (quote) => {
    const swap = await axios.post("https://lite-api.jup.ag/swap/v1/swap-instructions", {
        userPublicKey: wallet.publicKey.toBase58(),
        quoteResponse: quote,
    })
    console.log("/////////////// /swap-instructions ///////////////")
    console.log(swap.data)
    console.log("\n\n\n")
    return swap.data
}


// initialize the program
const keypair = loadKeypair()
const wallet = new Wallet(keypair);
const connection = new Connection(process.env.RPC_URL || "http://localhost:8899");
const provider = new AnchorProvider(connection, wallet);
const program = new Program(IDL, provider);

const main = async () => {
    const quote = await callQuote()
    const swapInstructionsRaw = await callSwapInstruction(quote)
    const swapInstruction = toTransactionInstruction(swapInstructionsRaw.swapInstruction)

    const instructions = [
        ...swapInstructionsRaw.computeBudgetInstructions.map(toTransactionInstruction),
        ...swapInstructionsRaw.setupInstructions.map(toTransactionInstruction),
        await program.methods
            .swap(swapInstruction.data)
            .accounts({})
            .remainingAccounts(swapInstruction.keys)
            .instruction(),
    ];



    const blockhash = (await connection.getLatestBlockhash()).blockhash;

    // If you want, you can add more lookup table accounts here
    const addressLookupTableAccounts = await addressesToAlt(
        swapInstructionsRaw.addressLookupTableAddresses
    );
    const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
        instructions,
    }).compileToV0Message(addressLookupTableAccounts);
    const transaction = new VersionedTransaction(messageV0);

    try {
        await provider.simulate(transaction, [wallet.payer]);

        const txID = await provider.sendAndConfirm(transaction, [wallet.payer]);
        console.log({ txID });
    } catch (e) {
        console.log({ simulationResponse: e.simulationResponse });
    }

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

const addressesToAlt = async (keys) => {
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


main()