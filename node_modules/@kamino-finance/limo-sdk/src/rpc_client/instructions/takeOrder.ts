import {
  TransactionInstruction,
  PublicKey,
  AccountMeta,
} from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface TakeOrderArgs {
  inputAmount: BN;
  minOutputAmount: BN;
  tipAmountPermissionlessTaking: BN;
}

export interface TakeOrderAccounts {
  taker: PublicKey;
  maker: PublicKey;
  globalConfig: PublicKey;
  pdaAuthority: PublicKey;
  order: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputVault: PublicKey;
  takerInputAta: PublicKey;
  takerOutputAta: PublicKey;
  intermediaryOutputTokenAccount: PublicKey;
  makerOutputAta: PublicKey;
  expressRelay: PublicKey;
  expressRelayMetadata: PublicKey;
  sysvarInstructions: PublicKey;
  permission: PublicKey;
  configRouter: PublicKey;
  inputTokenProgram: PublicKey;
  outputTokenProgram: PublicKey;
  rent: PublicKey;
  systemProgram: PublicKey;
  eventAuthority: PublicKey;
  program: PublicKey;
}

export const layout = borsh.struct([
  borsh.u64("inputAmount"),
  borsh.u64("minOutputAmount"),
  borsh.u64("tipAmountPermissionlessTaking"),
]);

export function takeOrder(
  args: TakeOrderArgs,
  accounts: TakeOrderAccounts,
  programId: PublicKey = PROGRAM_ID,
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.taker, isSigner: true, isWritable: true },
    { pubkey: accounts.maker, isSigner: false, isWritable: true },
    { pubkey: accounts.globalConfig, isSigner: false, isWritable: true },
    { pubkey: accounts.pdaAuthority, isSigner: false, isWritable: true },
    { pubkey: accounts.order, isSigner: false, isWritable: true },
    { pubkey: accounts.inputMint, isSigner: false, isWritable: false },
    { pubkey: accounts.outputMint, isSigner: false, isWritable: false },
    { pubkey: accounts.inputVault, isSigner: false, isWritable: true },
    { pubkey: accounts.takerInputAta, isSigner: false, isWritable: true },
    { pubkey: accounts.takerOutputAta, isSigner: false, isWritable: true },
    {
      pubkey: accounts.intermediaryOutputTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    { pubkey: accounts.makerOutputAta, isSigner: false, isWritable: true },
    { pubkey: accounts.expressRelay, isSigner: false, isWritable: false },
    {
      pubkey: accounts.expressRelayMetadata,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: accounts.sysvarInstructions, isSigner: false, isWritable: false },
    { pubkey: accounts.permission, isSigner: false, isWritable: false },
    { pubkey: accounts.configRouter, isSigner: false, isWritable: false },
    { pubkey: accounts.inputTokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.outputTokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.rent, isSigner: false, isWritable: false },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.eventAuthority, isSigner: false, isWritable: false },
    { pubkey: accounts.program, isSigner: false, isWritable: false },
  ];
  const identifier = Buffer.from([163, 208, 20, 172, 223, 65, 255, 228]);
  const buffer = Buffer.alloc(1000);
  const len = layout.encode(
    {
      inputAmount: args.inputAmount,
      minOutputAmount: args.minOutputAmount,
      tipAmountPermissionlessTaking: args.tipAmountPermissionlessTaking,
    },
    buffer,
  );
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len);
  const ix = new TransactionInstruction({ keys, programId, data });
  return ix;
}
