import { PublicKey } from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh";

export interface ActiveJSON {
  kind: "Active";
}

export class Active {
  static readonly discriminator = 0;
  static readonly kind = "Active";
  readonly discriminator = 0;
  readonly kind = "Active";

  toJSON(): ActiveJSON {
    return {
      kind: "Active",
    };
  }

  toEncodable() {
    return {
      Active: {},
    };
  }
}

export interface FilledJSON {
  kind: "Filled";
}

export class Filled {
  static readonly discriminator = 1;
  static readonly kind = "Filled";
  readonly discriminator = 1;
  readonly kind = "Filled";

  toJSON(): FilledJSON {
    return {
      kind: "Filled",
    };
  }

  toEncodable() {
    return {
      Filled: {},
    };
  }
}

export interface CancelledJSON {
  kind: "Cancelled";
}

export class Cancelled {
  static readonly discriminator = 2;
  static readonly kind = "Cancelled";
  readonly discriminator = 2;
  readonly kind = "Cancelled";

  toJSON(): CancelledJSON {
    return {
      kind: "Cancelled",
    };
  }

  toEncodable() {
    return {
      Cancelled: {},
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDecoded(obj: any): types.OrderStatusKind {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object");
  }

  if ("Active" in obj) {
    return new Active();
  }
  if ("Filled" in obj) {
    return new Filled();
  }
  if ("Cancelled" in obj) {
    return new Cancelled();
  }

  throw new Error("Invalid enum object");
}

export function fromJSON(obj: types.OrderStatusJSON): types.OrderStatusKind {
  switch (obj.kind) {
    case "Active": {
      return new Active();
    }
    case "Filled": {
      return new Filled();
    }
    case "Cancelled": {
      return new Cancelled();
    }
  }
}

export function layout(property?: string) {
  const ret = borsh.rustEnum([
    borsh.struct([], "Active"),
    borsh.struct([], "Filled"),
    borsh.struct([], "Cancelled"),
  ]);
  if (property !== undefined) {
    return ret.replicate(property);
  }
  return ret;
}
