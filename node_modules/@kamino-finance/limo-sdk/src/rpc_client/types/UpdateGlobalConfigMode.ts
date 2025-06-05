import { PublicKey } from "@solana/web3.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh";

export interface UpdateEmergencyModeJSON {
  kind: "UpdateEmergencyMode";
}

export class UpdateEmergencyMode {
  static readonly discriminator = 0;
  static readonly kind = "UpdateEmergencyMode";
  readonly discriminator = 0;
  readonly kind = "UpdateEmergencyMode";

  toJSON(): UpdateEmergencyModeJSON {
    return {
      kind: "UpdateEmergencyMode",
    };
  }

  toEncodable() {
    return {
      UpdateEmergencyMode: {},
    };
  }
}

export interface UpdateFlashTakeOrderBlockedJSON {
  kind: "UpdateFlashTakeOrderBlocked";
}

export class UpdateFlashTakeOrderBlocked {
  static readonly discriminator = 1;
  static readonly kind = "UpdateFlashTakeOrderBlocked";
  readonly discriminator = 1;
  readonly kind = "UpdateFlashTakeOrderBlocked";

  toJSON(): UpdateFlashTakeOrderBlockedJSON {
    return {
      kind: "UpdateFlashTakeOrderBlocked",
    };
  }

  toEncodable() {
    return {
      UpdateFlashTakeOrderBlocked: {},
    };
  }
}

export interface UpdateBlockNewOrdersJSON {
  kind: "UpdateBlockNewOrders";
}

export class UpdateBlockNewOrders {
  static readonly discriminator = 2;
  static readonly kind = "UpdateBlockNewOrders";
  readonly discriminator = 2;
  readonly kind = "UpdateBlockNewOrders";

  toJSON(): UpdateBlockNewOrdersJSON {
    return {
      kind: "UpdateBlockNewOrders",
    };
  }

  toEncodable() {
    return {
      UpdateBlockNewOrders: {},
    };
  }
}

export interface UpdateBlockOrderTakingJSON {
  kind: "UpdateBlockOrderTaking";
}

export class UpdateBlockOrderTaking {
  static readonly discriminator = 3;
  static readonly kind = "UpdateBlockOrderTaking";
  readonly discriminator = 3;
  readonly kind = "UpdateBlockOrderTaking";

  toJSON(): UpdateBlockOrderTakingJSON {
    return {
      kind: "UpdateBlockOrderTaking",
    };
  }

  toEncodable() {
    return {
      UpdateBlockOrderTaking: {},
    };
  }
}

export interface UpdateHostFeeBpsJSON {
  kind: "UpdateHostFeeBps";
}

export class UpdateHostFeeBps {
  static readonly discriminator = 4;
  static readonly kind = "UpdateHostFeeBps";
  readonly discriminator = 4;
  readonly kind = "UpdateHostFeeBps";

  toJSON(): UpdateHostFeeBpsJSON {
    return {
      kind: "UpdateHostFeeBps",
    };
  }

  toEncodable() {
    return {
      UpdateHostFeeBps: {},
    };
  }
}

export interface UpdateAdminAuthorityCachedJSON {
  kind: "UpdateAdminAuthorityCached";
}

export class UpdateAdminAuthorityCached {
  static readonly discriminator = 5;
  static readonly kind = "UpdateAdminAuthorityCached";
  readonly discriminator = 5;
  readonly kind = "UpdateAdminAuthorityCached";

  toJSON(): UpdateAdminAuthorityCachedJSON {
    return {
      kind: "UpdateAdminAuthorityCached",
    };
  }

  toEncodable() {
    return {
      UpdateAdminAuthorityCached: {},
    };
  }
}

export interface UpdateOrderTakingPermissionlessJSON {
  kind: "UpdateOrderTakingPermissionless";
}

export class UpdateOrderTakingPermissionless {
  static readonly discriminator = 6;
  static readonly kind = "UpdateOrderTakingPermissionless";
  readonly discriminator = 6;
  readonly kind = "UpdateOrderTakingPermissionless";

  toJSON(): UpdateOrderTakingPermissionlessJSON {
    return {
      kind: "UpdateOrderTakingPermissionless",
    };
  }

  toEncodable() {
    return {
      UpdateOrderTakingPermissionless: {},
    };
  }
}

export interface UpdateOrderCloseDelaySecondsJSON {
  kind: "UpdateOrderCloseDelaySeconds";
}

export class UpdateOrderCloseDelaySeconds {
  static readonly discriminator = 7;
  static readonly kind = "UpdateOrderCloseDelaySeconds";
  readonly discriminator = 7;
  readonly kind = "UpdateOrderCloseDelaySeconds";

  toJSON(): UpdateOrderCloseDelaySecondsJSON {
    return {
      kind: "UpdateOrderCloseDelaySeconds",
    };
  }

  toEncodable() {
    return {
      UpdateOrderCloseDelaySeconds: {},
    };
  }
}

export interface UpdateTxnFeeCostJSON {
  kind: "UpdateTxnFeeCost";
}

export class UpdateTxnFeeCost {
  static readonly discriminator = 8;
  static readonly kind = "UpdateTxnFeeCost";
  readonly discriminator = 8;
  readonly kind = "UpdateTxnFeeCost";

  toJSON(): UpdateTxnFeeCostJSON {
    return {
      kind: "UpdateTxnFeeCost",
    };
  }

  toEncodable() {
    return {
      UpdateTxnFeeCost: {},
    };
  }
}

export interface UpdateAtaCreationCostJSON {
  kind: "UpdateAtaCreationCost";
}

export class UpdateAtaCreationCost {
  static readonly discriminator = 9;
  static readonly kind = "UpdateAtaCreationCost";
  readonly discriminator = 9;
  readonly kind = "UpdateAtaCreationCost";

  toJSON(): UpdateAtaCreationCostJSON {
    return {
      kind: "UpdateAtaCreationCost",
    };
  }

  toEncodable() {
    return {
      UpdateAtaCreationCost: {},
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromDecoded(obj: any): types.UpdateGlobalConfigModeKind {
  if (typeof obj !== "object") {
    throw new Error("Invalid enum object");
  }

  if ("UpdateEmergencyMode" in obj) {
    return new UpdateEmergencyMode();
  }
  if ("UpdateFlashTakeOrderBlocked" in obj) {
    return new UpdateFlashTakeOrderBlocked();
  }
  if ("UpdateBlockNewOrders" in obj) {
    return new UpdateBlockNewOrders();
  }
  if ("UpdateBlockOrderTaking" in obj) {
    return new UpdateBlockOrderTaking();
  }
  if ("UpdateHostFeeBps" in obj) {
    return new UpdateHostFeeBps();
  }
  if ("UpdateAdminAuthorityCached" in obj) {
    return new UpdateAdminAuthorityCached();
  }
  if ("UpdateOrderTakingPermissionless" in obj) {
    return new UpdateOrderTakingPermissionless();
  }
  if ("UpdateOrderCloseDelaySeconds" in obj) {
    return new UpdateOrderCloseDelaySeconds();
  }
  if ("UpdateTxnFeeCost" in obj) {
    return new UpdateTxnFeeCost();
  }
  if ("UpdateAtaCreationCost" in obj) {
    return new UpdateAtaCreationCost();
  }

  throw new Error("Invalid enum object");
}

export function fromJSON(
  obj: types.UpdateGlobalConfigModeJSON,
): types.UpdateGlobalConfigModeKind {
  switch (obj.kind) {
    case "UpdateEmergencyMode": {
      return new UpdateEmergencyMode();
    }
    case "UpdateFlashTakeOrderBlocked": {
      return new UpdateFlashTakeOrderBlocked();
    }
    case "UpdateBlockNewOrders": {
      return new UpdateBlockNewOrders();
    }
    case "UpdateBlockOrderTaking": {
      return new UpdateBlockOrderTaking();
    }
    case "UpdateHostFeeBps": {
      return new UpdateHostFeeBps();
    }
    case "UpdateAdminAuthorityCached": {
      return new UpdateAdminAuthorityCached();
    }
    case "UpdateOrderTakingPermissionless": {
      return new UpdateOrderTakingPermissionless();
    }
    case "UpdateOrderCloseDelaySeconds": {
      return new UpdateOrderCloseDelaySeconds();
    }
    case "UpdateTxnFeeCost": {
      return new UpdateTxnFeeCost();
    }
    case "UpdateAtaCreationCost": {
      return new UpdateAtaCreationCost();
    }
  }
}

export function layout(property?: string) {
  const ret = borsh.rustEnum([
    borsh.struct([], "UpdateEmergencyMode"),
    borsh.struct([], "UpdateFlashTakeOrderBlocked"),
    borsh.struct([], "UpdateBlockNewOrders"),
    borsh.struct([], "UpdateBlockOrderTaking"),
    borsh.struct([], "UpdateHostFeeBps"),
    borsh.struct([], "UpdateAdminAuthorityCached"),
    borsh.struct([], "UpdateOrderTakingPermissionless"),
    borsh.struct([], "UpdateOrderCloseDelaySeconds"),
    borsh.struct([], "UpdateTxnFeeCost"),
    borsh.struct([], "UpdateAtaCreationCost"),
  ]);
  if (property !== undefined) {
    return ret.replicate(property);
  }
  return ret;
}
