import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface UserSwapBalancesStateFields {
  userLamports: BN;
  inputTaBalance: BN;
  outputTaBalance: BN;
}

export interface UserSwapBalancesStateJSON {
  userLamports: string;
  inputTaBalance: string;
  outputTaBalance: string;
}

export class UserSwapBalancesState {
  readonly userLamports: BN;
  readonly inputTaBalance: BN;
  readonly outputTaBalance: BN;

  static readonly discriminator = Buffer.from([
    140, 228, 152, 62, 231, 27, 245, 198,
  ]);

  static readonly layout = borsh.struct([
    borsh.u64("userLamports"),
    borsh.u64("inputTaBalance"),
    borsh.u64("outputTaBalance"),
  ]);

  constructor(fields: UserSwapBalancesStateFields) {
    this.userLamports = fields.userLamports;
    this.inputTaBalance = fields.inputTaBalance;
    this.outputTaBalance = fields.outputTaBalance;
  }

  static async fetch(
    c: Connection,
    address: PublicKey,
    programId: PublicKey = PROGRAM_ID,
  ): Promise<UserSwapBalancesState | null> {
    const info = await c.getAccountInfo(address);

    if (info === null) {
      return null;
    }
    if (!info.owner.equals(programId)) {
      throw new Error("account doesn't belong to this program");
    }

    return this.decode(info.data);
  }

  static async fetchMultiple(
    c: Connection,
    addresses: PublicKey[],
    programId: PublicKey = PROGRAM_ID,
  ): Promise<Array<UserSwapBalancesState | null>> {
    const infos = await c.getMultipleAccountsInfo(addresses);

    return infos.map((info) => {
      if (info === null) {
        return null;
      }
      if (!info.owner.equals(programId)) {
        throw new Error("account doesn't belong to this program");
      }

      return this.decode(info.data);
    });
  }

  static decode(data: Buffer): UserSwapBalancesState {
    if (!data.slice(0, 8).equals(UserSwapBalancesState.discriminator)) {
      throw new Error("invalid account discriminator");
    }

    const dec = UserSwapBalancesState.layout.decode(data.slice(8));

    return new UserSwapBalancesState({
      userLamports: dec.userLamports,
      inputTaBalance: dec.inputTaBalance,
      outputTaBalance: dec.outputTaBalance,
    });
  }

  toJSON(): UserSwapBalancesStateJSON {
    return {
      userLamports: this.userLamports.toString(),
      inputTaBalance: this.inputTaBalance.toString(),
      outputTaBalance: this.outputTaBalance.toString(),
    };
  }

  static fromJSON(obj: UserSwapBalancesStateJSON): UserSwapBalancesState {
    return new UserSwapBalancesState({
      userLamports: new BN(obj.userLamports),
      inputTaBalance: new BN(obj.inputTaBalance),
      outputTaBalance: new BN(obj.outputTaBalance),
    });
  }
}
