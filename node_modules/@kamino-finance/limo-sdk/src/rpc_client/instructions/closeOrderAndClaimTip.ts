import {
  TransactionInstruction,
  PublicKey,
  AccountMeta,
} from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface CloseOrderAndClaimTipAccounts {
  maker: PublicKey;
  order: PublicKey;
  globalConfig: PublicKey;
  pdaAuthority: PublicKey;
  inputMint: PublicKey;
  /** - required only for indexing the order state from the instruction */
  outputMint: PublicKey;
  makerInputAta: PublicKey;
  inputVault: PublicKey;
  inputTokenProgram: PublicKey;
  systemProgram: PublicKey;
  eventAuthority: PublicKey;
  program: PublicKey;
}

export function closeOrderAndClaimTip(
  accounts: CloseOrderAndClaimTipAccounts,
  programId: PublicKey = PROGRAM_ID,
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.maker, isSigner: true, isWritable: true },
    { pubkey: accounts.order, isSigner: false, isWritable: true },
    { pubkey: accounts.globalConfig, isSigner: false, isWritable: true },
    { pubkey: accounts.pdaAuthority, isSigner: false, isWritable: true },
    { pubkey: accounts.inputMint, isSigner: false, isWritable: false },
    { pubkey: accounts.outputMint, isSigner: false, isWritable: false },
    { pubkey: accounts.makerInputAta, isSigner: false, isWritable: true },
    { pubkey: accounts.inputVault, isSigner: false, isWritable: true },
    { pubkey: accounts.inputTokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.eventAuthority, isSigner: false, isWritable: false },
    { pubkey: accounts.program, isSigner: false, isWritable: false },
  ];
  const identifier = Buffer.from([244, 27, 12, 226, 45, 247, 230, 43]);
  const data = identifier;
  const ix = new TransactionInstruction({ keys, programId, data });
  return ix;
}
