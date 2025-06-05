import {
  TransactionInstruction,
  PublicKey,
  AccountMeta,
} from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface CreateOrderArgs {
  inputAmount: BN;
  outputAmount: BN;
  orderType: number;
}

export interface CreateOrderAccounts {
  maker: PublicKey;
  globalConfig: PublicKey;
  pdaAuthority: PublicKey;
  order: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  makerAta: PublicKey;
  inputVault: PublicKey;
  inputTokenProgram: PublicKey;
  outputTokenProgram: PublicKey;
  systemProgram: PublicKey;
  eventAuthority: PublicKey;
  program: PublicKey;
}

export const layout = borsh.struct([
  borsh.u64("inputAmount"),
  borsh.u64("outputAmount"),
  borsh.u8("orderType"),
]);

export function createOrder(
  args: CreateOrderArgs,
  accounts: CreateOrderAccounts,
  programId: PublicKey = PROGRAM_ID,
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.maker, isSigner: true, isWritable: true },
    { pubkey: accounts.globalConfig, isSigner: false, isWritable: true },
    { pubkey: accounts.pdaAuthority, isSigner: false, isWritable: false },
    { pubkey: accounts.order, isSigner: false, isWritable: true },
    { pubkey: accounts.inputMint, isSigner: false, isWritable: false },
    { pubkey: accounts.outputMint, isSigner: false, isWritable: false },
    { pubkey: accounts.makerAta, isSigner: false, isWritable: true },
    { pubkey: accounts.inputVault, isSigner: false, isWritable: true },
    { pubkey: accounts.inputTokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.outputTokenProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.eventAuthority, isSigner: false, isWritable: false },
    { pubkey: accounts.program, isSigner: false, isWritable: false },
  ];
  const identifier = Buffer.from([141, 54, 37, 207, 237, 210, 250, 215]);
  const buffer = Buffer.alloc(1000);
  const len = layout.encode(
    {
      inputAmount: args.inputAmount,
      outputAmount: args.outputAmount,
      orderType: args.orderType,
    },
    buffer,
  );
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len);
  const ix = new TransactionInstruction({ keys, programId, data });
  return ix;
}
