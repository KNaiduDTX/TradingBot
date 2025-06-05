import { PublicKey } from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh";

export type BoolFields = [boolean];
export type BoolValue = [boolean];

export interface BoolJSON {
  kind: "Bool";
  value: [boolean];
}

export class Bool {
  static readonly discriminator = 0;
  static readonly kind = "Bool";
  readonly discriminator = 0;
  readonly kind = "Bool";
  readonly value: BoolValue;

  constructor(value: BoolFields) {
    this.value = [value[0]];
  }

  toJSON(): BoolJSON {
    return {
      kind: "Bool",
      value: [this.value[0]],
    };
  }

  toEncodable() {
    return {
      Bool: {
        _0: this.value[0],
      },
    };
  }
}

export type U16Fields = [number];
export type U16Value = [number];

export interface U16JSON {
  kind: "U16";
  value: [number];
}

export class U16 {
  static readonly discriminator = 1;
  static readonly kind = "U16";
  readonly discriminator = 1;
  readonly kind = "U16";
  readonly value: U16Value;

  constructor(value: U16Fields) {
    this.value = [value[0]];
  }

  toJSON(): U16JSON {
    return {
      kind: "U16",
      value: [this.value[0]],
    };
  }

  toEncodable() {
    return {
      U16: {
        _0: this.value[0],
      },
    };
  }
}

export type U64Fields = [BN];
export type U64Value = [BN];

export interface U64JSON {
  kind: "U64";
  value: [string];
}

export class U64 {
  static readonly discriminator = 2;
  static readonly kind = "U64";
  readonly discriminator = 2;
  readonly kind = "U64";
  readonly value: U64Value;

  constructor(value: U64Fields) {
    this.value = [value[0]];
  }

  toJSON(): U64JSON {
    return {
      kind: "U64",
      value: [this.value[0].toString()],
    };
  }

  toEncodable() {
    return {
      U64: {
        _0: this.value[0],
      },
    };
  }
}

export type PubkeyFields = [PublicKey];
export type PubkeyValue = [PublicKey];

export interface PubkeyJSON {
  kind: "Pubkey";
  value: [string];
}

export class Pubkey {
  static readonly discriminator = 3;
  static readonly kind = "Pubkey";
  readonly discriminator = 3;
  readonly kind = "Pubkey";
  readonly value: PubkeyValue;

  constructor(value: PubkeyFields) {
    this.value = [value[0]];
  }

  toJSON(): PubkeyJSON {
    return {
      kind: "Pubkey",
      value: [this.value[0].toString()],
    };
  }

  toEncodable() {
    return {
      Pubkey: {
        _0: this.value[0],
      },
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDecoded(obj: any): types.UpdateGlobalConfigValueKind {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object");
  }

  if ("Bool" in obj) {
    const val = obj["Bool"];
    return new Bool([val["_0"]]);
  }
  if ("U16" in obj) {
    const val = obj["U16"];
    return new U16([val["_0"]]);
  }
  if ("U64" in obj) {
    const val = obj["U64"];
    return new U64([val["_0"]]);
  }
  if ("Pubkey" in obj) {
    const val = obj["Pubkey"];
    return new Pubkey([val["_0"]]);
  }

  throw new Error("Invalid enum object");
}

export function fromJSON(
  obj: types.UpdateGlobalConfigValueJSON,
): types.UpdateGlobalConfigValueKind {
  switch (obj.kind) {
    case "Bool": {
      return new Bool([obj.value[0]]);
    }
    case "U16": {
      return new U16([obj.value[0]]);
    }
    case "U64": {
      return new U64([new BN(obj.value[0])]);
    }
    case "Pubkey": {
      return new Pubkey([new PublicKey(obj.value[0])]);
    }
  }
}

export function layout(property?: string) {
  const ret = borsh.rustEnum([
    borsh.struct([borsh.bool("_0")], "Bool"),
    borsh.struct([borsh.u16("_0")], "U16"),
    borsh.struct([borsh.u64("_0")], "U64"),
    borsh.struct([borsh.publicKey("_0")], "Pubkey"),
  ]);
  if (property !== undefined) {
    return ret.replicate(property);
  }
  return ret;
}
