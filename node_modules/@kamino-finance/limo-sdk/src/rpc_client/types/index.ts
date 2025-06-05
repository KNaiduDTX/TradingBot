import * as OrderStatus from "./OrderStatus";
import * as OrderType from "./OrderType";
import * as UpdateGlobalConfigMode from "./UpdateGlobalConfigMode";
import * as UpdateGlobalConfigValue from "./UpdateGlobalConfigValue";

export { OrderStatus };

export type OrderStatusKind =
  | OrderStatus.Active
  | OrderStatus.Filled
  | OrderStatus.Cancelled;
export type OrderStatusJSON =
  | OrderStatus.ActiveJSON
  | OrderStatus.FilledJSON
  | OrderStatus.CancelledJSON;

export { OrderType };

export type OrderTypeKind = OrderType.Vanilla;
export type OrderTypeJSON = OrderType.VanillaJSON;

export { UpdateGlobalConfigMode };

export type UpdateGlobalConfigModeKind =
  | UpdateGlobalConfigMode.UpdateEmergencyMode
  | UpdateGlobalConfigMode.UpdateFlashTakeOrderBlocked
  | UpdateGlobalConfigMode.UpdateBlockNewOrders
  | UpdateGlobalConfigMode.UpdateBlockOrderTaking
  | UpdateGlobalConfigMode.UpdateHostFeeBps
  | UpdateGlobalConfigMode.UpdateAdminAuthorityCached
  | UpdateGlobalConfigMode.UpdateOrderTakingPermissionless
  | UpdateGlobalConfigMode.UpdateOrderCloseDelaySeconds
  | UpdateGlobalConfigMode.UpdateTxnFeeCost
  | UpdateGlobalConfigMode.UpdateAtaCreationCost;
export type UpdateGlobalConfigModeJSON =
  | UpdateGlobalConfigMode.UpdateEmergencyModeJSON
  | UpdateGlobalConfigMode.UpdateFlashTakeOrderBlockedJSON
  | UpdateGlobalConfigMode.UpdateBlockNewOrdersJSON
  | UpdateGlobalConfigMode.UpdateBlockOrderTakingJSON
  | UpdateGlobalConfigMode.UpdateHostFeeBpsJSON
  | UpdateGlobalConfigMode.UpdateAdminAuthorityCachedJSON
  | UpdateGlobalConfigMode.UpdateOrderTakingPermissionlessJSON
  | UpdateGlobalConfigMode.UpdateOrderCloseDelaySecondsJSON
  | UpdateGlobalConfigMode.UpdateTxnFeeCostJSON
  | UpdateGlobalConfigMode.UpdateAtaCreationCostJSON;

export { UpdateGlobalConfigValue };

export type UpdateGlobalConfigValueKind =
  | UpdateGlobalConfigValue.Bool
  | UpdateGlobalConfigValue.U16
  | UpdateGlobalConfigValue.U64
  | UpdateGlobalConfigValue.Pubkey;
export type UpdateGlobalConfigValueJSON =
  | UpdateGlobalConfigValue.BoolJSON
  | UpdateGlobalConfigValue.U16JSON
  | UpdateGlobalConfigValue.U64JSON
  | UpdateGlobalConfigValue.PubkeyJSON;
