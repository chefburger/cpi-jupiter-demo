import {
    PublicKey,
    AddressLookupTableAccount,
    TransactionInstruction,
    VersionedTransaction,
    TransactionMessage,
} from "@solana/web3.js";
import { callQuote, callSwapInstruction } from "../../app/utils/apis";


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

export const swap = async (program, wallet, provider, inputMint, outputMint) => {
    const quote = await callQuote(inputMint, outputMint)
    const swapInstructionsRaw = await callSwapInstruction(wallet.publicKey.toString(), quote)
    const swapInstruction = toTransactionInstruction(swapInstructionsRaw.swapInstruction)

    const instructions = [
        // TODO: is this needed?
        ...swapInstructionsRaw.computeBudgetInstructions.map(toTransactionInstruction),
        ...swapInstructionsRaw.setupInstructions.map(toTransactionInstruction),
        await program.methods
            .swap(swapInstruction.data)
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
        const tx = await provider.sendAndConfirm(transaction, [wallet.payer]);
    } catch (e) {
        console.log(e)
        console.log(await e.getLogs())
    }
}
