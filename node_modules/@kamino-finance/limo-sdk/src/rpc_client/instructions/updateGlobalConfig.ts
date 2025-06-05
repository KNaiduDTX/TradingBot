import {
  TransactionInstruction,
  PublicKey,
  AccountMeta,
} from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface UpdateGlobalConfigArgs {
  mode: number;
  value: Array<number>;
}

export interface UpdateGlobalConfigAccounts {
  adminAuthority: PublicKey;
  globalConfig: PublicKey;
}

export const layout = borsh.struct([
  borsh.u16("mode"),
  borsh.array(borsh.u8(), 128, "value"),
]);

export function updateGlobalConfig(
  args: UpdateGlobalConfigArgs,
  accounts: UpdateGlobalConfigAccounts,
  programId: PublicKey = PROGRAM_ID,
) {
  const keys: Array<AccountMeta> = [
    { pubkey: accounts.adminAuthority, isSigner: true, isWritable: true },
    { pubkey: accounts.globalConfig, isSigner: false, isWritable: true },
  ];
  const identifier = Buffer.from([164, 84, 130, 189, 111, 58, 250, 200]);
  const buffer = Buffer.alloc(1000);
  const len = layout.encode(
    {
      mode: args.mode,
      value: args.value,
    },
    buffer,
  );
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len);
  const ix = new TransactionInstruction({ keys, programId, data });
  return ix;
}
