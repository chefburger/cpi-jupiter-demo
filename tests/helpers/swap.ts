import {
    PublicKey,
    AddressLookupTableAccount,
    TransactionInstruction,
    VersionedTransaction,
    TransactionMessage,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { callQuote, callSwapInstruction } from "../../app/utils/apis";
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";


const toTransactionInstruction = (
    instructionPayload,
    overrideIsSigner = false
) => {
    return new TransactionInstruction({
        programId: new PublicKey(instructionPayload.programId),
        keys: instructionPayload.accounts.map((key) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: overrideIsSigner ? false : key.isSigner,
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

export const swapByUser = async (program, inputMint, outputMint, amount) => {
    const provider = anchor.getProvider();
    const wallet = provider.wallet;

    const quote = await callQuote(inputMint, outputMint, amount)
    const swapInstructionsRaw = await callSwapInstruction(wallet.publicKey.toString(), quote)
    const swapInstruction = toTransactionInstruction(swapInstructionsRaw.swapInstruction)

    const instructions = [
        ...swapInstructionsRaw.computeBudgetInstructions.map(toTransactionInstruction),
        ...swapInstructionsRaw.setupInstructions.map(toTransactionInstruction),
        await program.methods
            .swapByUser(swapInstruction.data)
            .accounts({})
            .remainingAccounts(swapInstruction.keys)
            .instruction(),
    ];

    const blockhash = (await provider.connection.getLatestBlockhash()).blockhash;

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

    try {
        await provider.sendAndConfirm(transaction, [wallet.payer]);
    } catch (e) {
        console.log("Reason: \n")
        console.log(e)
    }
}


export const swapByProgram = async (program, inputMint, outputMint, amount) => {
    const provider = anchor.getProvider();
    const wallet = provider.wallet;

    // get the program's vault ATA
    const userAta = await getAssociatedTokenAddress(new PublicKey(inputMint), wallet.publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
    const vaultPda = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId)[0]
    const programVaultAta = await getAssociatedTokenAddress(new PublicKey(inputMint), vaultPda, true)
    console.log("userAta", userAta.toString())
    console.log("vaultPda", vaultPda.toString())
    console.log("programVaultAta", programVaultAta.toString())



    const quote = await callQuote(inputMint, outputMint, amount)
    const swapInstructionsRaw = await callSwapInstruction(vaultPda.toString(), quote)
    const swapInstruction = toTransactionInstruction(swapInstructionsRaw.swapInstruction, true)

    const instructions = [
        ...swapInstructionsRaw.computeBudgetInstructions.map(toTransactionInstruction),

        // create vault ATA and transfer tokens to vault
        await program.methods
            // TOCONFIRM: swap takes more than specified
            .initializeVault(new anchor.BN(amount + LAMPORTS_PER_SOL))
            .accounts({
                payer: wallet.publicKey,
                vaultPda: vaultPda,
                inputTokenMint: new PublicKey(inputMint),
                outputTokenMint: new PublicKey(outputMint),
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .instruction(),

        // setup instructions are not needed for the program because we aasume the input token is already in program's ATA
        // ...swapInstructionsRaw.setupInstructions.map(toTransactionInstruction),

        await program.methods
            .swapByProgram(swapInstruction.data)
            .accounts({
                inputTokenMint: new PublicKey(inputMint),
            })
            .remainingAccounts(swapInstruction.keys)
            .instruction(),
    ];

    const blockhash = (await provider.connection.getLatestBlockhash()).blockhash;

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

    try {
        await provider.sendAndConfirm(transaction, [wallet.payer], { skipPreflight: true });
    } catch (e) {
        console.log("Reason: \n")
        console.log(JSON.stringify(e, null, 2))
        throw e
    }
}
