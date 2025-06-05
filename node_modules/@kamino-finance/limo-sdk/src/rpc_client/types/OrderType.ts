import { PublicKey } from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh";

export interface VanillaJSON {
  kind: "Vanilla";
}

export class Vanilla {
  static readonly discriminator = 0;
  static readonly kind = "Vanilla";
  readonly discriminator = 0;
  readonly kind = "Vanilla";

  toJSON(): VanillaJSON {
    return {
      kind: "Vanilla",
    };
  }

  toEncodable() {
    return {
      Vanilla: {},
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDecoded(obj: any): types.OrderTypeKind {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object");
  }

  if ("Vanilla" in obj) {
    return new Vanilla();
  }

  throw new Error("Invalid enum object");
}

export function fromJSON(obj: types.OrderTypeJSON): types.OrderTypeKind {
  switch (obj.kind) {
    case "Vanilla": {
      return new Vanilla();
    }
  }
}

export function layout(property?: string) {
  const ret = borsh.rustEnum([borsh.struct([], "Vanilla")]);
  if (property !== undefined) {
    return ret.replicate(property);
  }
  return ret;
}
