import {
  TransactionInstruction,
  PublicKey,
  AccountMeta,
} from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface LogUserSwapBalancesAccounts {
  maker: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputTa: PublicKey;
  outputTa: PublicKey;
  /** if it's not the pda it doesn't matter */
  pdaReferrer: PublicKey;
  eventAuthority: PublicKey;
  program: PublicKey;
}

export function logUserSwapBalances(
  accounts: LogUserSwapBalancesAccounts,
  programId: PublicKey = PROGRAM_ID,
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.maker, isSigner: true, isWritable: false },
    { pubkey: accounts.inputMint, isSigner: false, isWritable: false },
    { pubkey: accounts.outputMint, isSigner: false, isWritable: false },
    { pubkey: accounts.inputTa, isSigner: false, isWritable: false },
    { pubkey: accounts.outputTa, isSigner: false, isWritable: false },
    { pubkey: accounts.pdaReferrer, isSigner: false, isWritable: false },
    { pubkey: accounts.eventAuthority, isSigner: false, isWritable: false },
    { pubkey: accounts.program, isSigner: false, isWritable: false },
  ];
  const identifier = Buffer.from([35, 118, 95, 77, 231, 46, 128, 38]);
  const data = identifier;
  const ix = new TransactionInstruction({ keys, programId, data });
  return ix;
}
