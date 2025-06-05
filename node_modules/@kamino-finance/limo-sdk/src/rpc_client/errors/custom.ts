export type CustomError =
  | OrderCanNotBeCanceled
  | OrderNotActive
  | InvalidAdminAuthority
  | InvalidPdaAuthority
  | InvalidConfigOption
  | InvalidOrderOwner
  | OutOfRangeIntegralConversion
  | InvalidFlag
  | MathOverflow
  | OrderInputAmountInvalid
  | OrderOutputAmountInvalid
  | InvalidHostFee
  | IntegerOverflow
  | InvalidTipBalance
  | InvalidTipTransferAmount
  | InvalidHostTipBalance
  | OrderWithinFlashOperation
  | CPINotAllowed
  | FlashTakeOrderBlocked
  | FlashTxWithUnexpectedIxs
  | FlashIxsNotEnded
  | FlashIxsNotStarted
  | FlashIxsAccountMismatch
  | FlashIxsArgsMismatch
  | OrderNotWithinFlashOperation
  | EmergencyModeEnabled
  | CreatingNewOrdersBlocked
  | OrderTakingBlocked
  | OrderInputAmountTooLarge
  | PermissionRequiredPermissionlessNotEnabled
  | PermissionDoesNotMatchOrder
  | InvalidAtaAddress
  | MakerOutputAtaRequired
  | IntermediaryOutputTokenAccountRequired
  | NotEnoughBalanceForRent
  | NotEnoughTimePassedSinceLastUpdate
  | OrderSameMint
  | UnsupportedTokenExtension
  | InvalidTokenAccount
  | OrderTypeInvalid
  | UninitializedTokenAccount
  | InvalidTokenAccountOwner
  | InvalidAccount
  | InvalidTokenMint
  | InvalidTokenAuthority;

export class OrderCanNotBeCanceled extends Error {
  static readonly code = 6000;
  readonly code = 6000;
  readonly name = "OrderCanNotBeCanceled";
  readonly msg = "Order can't be canceled";

  constructor(readonly logs?: string[]) {
    super("6000: Order can't be canceled");
  }
}

export class OrderNotActive extends Error {
  static readonly code = 6001;
  readonly code = 6001;
  readonly name = "OrderNotActive";
  readonly msg = "Order not active";

  constructor(readonly logs?: string[]) {
    super("6001: Order not active");
  }
}

export class InvalidAdminAuthority extends Error {
  static readonly code = 6002;
  readonly code = 6002;
  readonly name = "InvalidAdminAuthority";
  readonly msg = "Invalid admin authority";

  constructor(readonly logs?: string[]) {
    super("6002: Invalid admin authority");
  }
}

export class InvalidPdaAuthority extends Error {
  static readonly code = 6003;
  readonly code = 6003;
  readonly name = "InvalidPdaAuthority";
  readonly msg = "Invalid pda authority";

  constructor(readonly logs?: string[]) {
    super("6003: Invalid pda authority");
  }
}

export class InvalidConfigOption extends Error {
  static readonly code = 6004;
  readonly code = 6004;
  readonly name = "InvalidConfigOption";
  readonly msg = "Invalid config option";

  constructor(readonly logs?: string[]) {
    super("6004: Invalid config option");
  }
}

export class InvalidOrderOwner extends Error {
  static readonly code = 6005;
  readonly code = 6005;
  readonly name = "InvalidOrderOwner";
  readonly msg = "Order owner account is not the order owner";

  constructor(readonly logs?: string[]) {
    super("6005: Order owner account is not the order owner");
  }
}

export class OutOfRangeIntegralConversion extends Error {
  static readonly code = 6006;
  readonly code = 6006;
  readonly name = "OutOfRangeIntegralConversion";
  readonly msg = "Out of range integral conversion attempted";

  constructor(readonly logs?: string[]) {
    super("6006: Out of range integral conversion attempted");
  }
}

export class InvalidFlag extends Error {
  static readonly code = 6007;
  readonly code = 6007;
  readonly name = "InvalidFlag";
  readonly msg = "Invalid boolean flag, valid values are 0 and 1";

  constructor(readonly logs?: string[]) {
    super("6007: Invalid boolean flag, valid values are 0 and 1");
  }
}

export class MathOverflow extends Error {
  static readonly code = 6008;
  readonly code = 6008;
  readonly name = "MathOverflow";
  readonly msg = "Mathematical operation with overflow";

  constructor(readonly logs?: string[]) {
    super("6008: Mathematical operation with overflow");
  }
}

export class OrderInputAmountInvalid extends Error {
  static readonly code = 6009;
  readonly code = 6009;
  readonly name = "OrderInputAmountInvalid";
  readonly msg = "Order input amount invalid";

  constructor(readonly logs?: string[]) {
    super("6009: Order input amount invalid");
  }
}

export class OrderOutputAmountInvalid extends Error {
  static readonly code = 6010;
  readonly code = 6010;
  readonly name = "OrderOutputAmountInvalid";
  readonly msg = "Order output amount invalid";

  constructor(readonly logs?: string[]) {
    super("6010: Order output amount invalid");
  }
}

export class InvalidHostFee extends Error {
  static readonly code = 6011;
  readonly code = 6011;
  readonly name = "InvalidHostFee";
  readonly msg = "Host fee bps must be between 0 and 10000";

  constructor(readonly logs?: string[]) {
    super("6011: Host fee bps must be between 0 and 10000");
  }
}

export class IntegerOverflow extends Error {
  static readonly code = 6012;
  readonly code = 6012;
  readonly name = "IntegerOverflow";
  readonly msg = "Conversion between integers failed";

  constructor(readonly logs?: string[]) {
    super("6012: Conversion between integers failed");
  }
}

export class InvalidTipBalance extends Error {
  static readonly code = 6013;
  readonly code = 6013;
  readonly name = "InvalidTipBalance";
  readonly msg = "Tip balance less than accounted tip";

  constructor(readonly logs?: string[]) {
    super("6013: Tip balance less than accounted tip");
  }
}

export class InvalidTipTransferAmount extends Error {
  static readonly code = 6014;
  readonly code = 6014;
  readonly name = "InvalidTipTransferAmount";
  readonly msg = "Tip transfer amount is less than expected";

  constructor(readonly logs?: string[]) {
    super("6014: Tip transfer amount is less than expected");
  }
}

export class InvalidHostTipBalance extends Error {
  static readonly code = 6015;
  readonly code = 6015;
  readonly name = "InvalidHostTipBalance";
  readonly msg = "Host tup amount is less than accounted for";

  constructor(readonly logs?: string[]) {
    super("6015: Host tup amount is less than accounted for");
  }
}

export class OrderWithinFlashOperation extends Error {
  static readonly code = 6016;
  readonly code = 6016;
  readonly name = "OrderWithinFlashOperation";
  readonly msg = "Order within flash operation - all otehr actions are blocked";

  constructor(readonly logs?: string[]) {
    super("6016: Order within flash operation - all otehr actions are blocked");
  }
}

export class CPINotAllowed extends Error {
  static readonly code = 6017;
  readonly code = 6017;
  readonly name = "CPINotAllowed";
  readonly msg = "CPI not allowed";

  constructor(readonly logs?: string[]) {
    super("6017: CPI not allowed");
  }
}

export class FlashTakeOrderBlocked extends Error {
  static readonly code = 6018;
  readonly code = 6018;
  readonly name = "FlashTakeOrderBlocked";
  readonly msg = "Flash take_order is blocked";

  constructor(readonly logs?: string[]) {
    super("6018: Flash take_order is blocked");
  }
}

export class FlashTxWithUnexpectedIxs extends Error {
  static readonly code = 6019;
  readonly code = 6019;
  readonly name = "FlashTxWithUnexpectedIxs";
  readonly msg =
    "Some unexpected instructions are present in the tx. Either before or after the flash ixs, or some ix target the same program between";

  constructor(readonly logs?: string[]) {
    super(
      "6019: Some unexpected instructions are present in the tx. Either before or after the flash ixs, or some ix target the same program between",
    );
  }
}

export class FlashIxsNotEnded extends Error {
  static readonly code = 6020;
  readonly code = 6020;
  readonly name = "FlashIxsNotEnded";
  readonly msg =
    "Flash ixs initiated without the closing ix in the transaction";

  constructor(readonly logs?: string[]) {
    super(
      "6020: Flash ixs initiated without the closing ix in the transaction",
    );
  }
}

export class FlashIxsNotStarted extends Error {
  static readonly code = 6021;
  readonly code = 6021;
  readonly name = "FlashIxsNotStarted";
  readonly msg = "Flash ixs ended without the starting ix in the transaction";

  constructor(readonly logs?: string[]) {
    super("6021: Flash ixs ended without the starting ix in the transaction");
  }
}

export class FlashIxsAccountMismatch extends Error {
  static readonly code = 6022;
  readonly code = 6022;
  readonly name = "FlashIxsAccountMismatch";
  readonly msg = "Some accounts differ between the two flash ixs";

  constructor(readonly logs?: string[]) {
    super("6022: Some accounts differ between the two flash ixs");
  }
}

export class FlashIxsArgsMismatch extends Error {
  static readonly code = 6023;
  readonly code = 6023;
  readonly name = "FlashIxsArgsMismatch";
  readonly msg = "Some args differ between the two flash ixs";

  constructor(readonly logs?: string[]) {
    super("6023: Some args differ between the two flash ixs");
  }
}

export class OrderNotWithinFlashOperation extends Error {
  static readonly code = 6024;
  readonly code = 6024;
  readonly name = "OrderNotWithinFlashOperation";
  readonly msg = "Order is not within flash operation";

  constructor(readonly logs?: string[]) {
    super("6024: Order is not within flash operation");
  }
}

export class EmergencyModeEnabled extends Error {
  static readonly code = 6025;
  readonly code = 6025;
  readonly name = "EmergencyModeEnabled";
  readonly msg = "Emergency mode is enabled";

  constructor(readonly logs?: string[]) {
    super("6025: Emergency mode is enabled");
  }
}

export class CreatingNewOrdersBlocked extends Error {
  static readonly code = 6026;
  readonly code = 6026;
  readonly name = "CreatingNewOrdersBlocked";
  readonly msg = "Creating new ordersis blocked";

  constructor(readonly logs?: string[]) {
    super("6026: Creating new ordersis blocked");
  }
}

export class OrderTakingBlocked extends Error {
  static readonly code = 6027;
  readonly code = 6027;
  readonly name = "OrderTakingBlocked";
  readonly msg = "Orders taking is blocked";

  constructor(readonly logs?: string[]) {
    super("6027: Orders taking is blocked");
  }
}

export class OrderInputAmountTooLarge extends Error {
  static readonly code = 6028;
  readonly code = 6028;
  readonly name = "OrderInputAmountTooLarge";
  readonly msg = "Order input amount larger than the remaining";

  constructor(readonly logs?: string[]) {
    super("6028: Order input amount larger than the remaining");
  }
}

export class PermissionRequiredPermissionlessNotEnabled extends Error {
  static readonly code = 6029;
  readonly code = 6029;
  readonly name = "PermissionRequiredPermissionlessNotEnabled";
  readonly msg =
    "Permissionless order taking not enabled, please provide permission account";

  constructor(readonly logs?: string[]) {
    super(
      "6029: Permissionless order taking not enabled, please provide permission account",
    );
  }
}

export class PermissionDoesNotMatchOrder extends Error {
  static readonly code = 6030;
  readonly code = 6030;
  readonly name = "PermissionDoesNotMatchOrder";
  readonly msg = "Permission address does not match order address";

  constructor(readonly logs?: string[]) {
    super("6030: Permission address does not match order address");
  }
}

export class InvalidAtaAddress extends Error {
  static readonly code = 6031;
  readonly code = 6031;
  readonly name = "InvalidAtaAddress";
  readonly msg = "Invalid ata address";

  constructor(readonly logs?: string[]) {
    super("6031: Invalid ata address");
  }
}

export class MakerOutputAtaRequired extends Error {
  static readonly code = 6032;
  readonly code = 6032;
  readonly name = "MakerOutputAtaRequired";
  readonly msg = "Maker output ata required when output mint is not WSOL";

  constructor(readonly logs?: string[]) {
    super("6032: Maker output ata required when output mint is not WSOL");
  }
}

export class IntermediaryOutputTokenAccountRequired extends Error {
  static readonly code = 6033;
  readonly code = 6033;
  readonly name = "IntermediaryOutputTokenAccountRequired";
  readonly msg =
    "Intermediary output token account required when output mint is WSOL";

  constructor(readonly logs?: string[]) {
    super(
      "6033: Intermediary output token account required when output mint is WSOL",
    );
  }
}

export class NotEnoughBalanceForRent extends Error {
  static readonly code = 6034;
  readonly code = 6034;
  readonly name = "NotEnoughBalanceForRent";
  readonly msg = "Not enough balance for rent";

  constructor(readonly logs?: string[]) {
    super("6034: Not enough balance for rent");
  }
}

export class NotEnoughTimePassedSinceLastUpdate extends Error {
  static readonly code = 6035;
  readonly code = 6035;
  readonly name = "NotEnoughTimePassedSinceLastUpdate";
  readonly msg =
    "Order can not be closed - Not enough time passed since last update";

  constructor(readonly logs?: string[]) {
    super(
      "6035: Order can not be closed - Not enough time passed since last update",
    );
  }
}

export class OrderSameMint extends Error {
  static readonly code = 6036;
  readonly code = 6036;
  readonly name = "OrderSameMint";
  readonly msg = "Order input and output mints are the same";

  constructor(readonly logs?: string[]) {
    super("6036: Order input and output mints are the same");
  }
}

export class UnsupportedTokenExtension extends Error {
  static readonly code = 6037;
  readonly code = 6037;
  readonly name = "UnsupportedTokenExtension";
  readonly msg = "Mint has a token (2022) extension that is not supported";

  constructor(readonly logs?: string[]) {
    super("6037: Mint has a token (2022) extension that is not supported");
  }
}

export class InvalidTokenAccount extends Error {
  static readonly code = 6038;
  readonly code = 6038;
  readonly name = "InvalidTokenAccount";
  readonly msg = "Can't have an spl token mint with a t22 account";

  constructor(readonly logs?: string[]) {
    super("6038: Can't have an spl token mint with a t22 account");
  }
}

export class OrderTypeInvalid extends Error {
  static readonly code = 6039;
  readonly code = 6039;
  readonly name = "OrderTypeInvalid";
  readonly msg = "The order type is invalid";

  constructor(readonly logs?: string[]) {
    super("6039: The order type is invalid");
  }
}

export class UninitializedTokenAccount extends Error {
  static readonly code = 6040;
  readonly code = 6040;
  readonly name = "UninitializedTokenAccount";
  readonly msg = "Token account is not initialized";

  constructor(readonly logs?: string[]) {
    super("6040: Token account is not initialized");
  }
}

export class InvalidTokenAccountOwner extends Error {
  static readonly code = 6041;
  readonly code = 6041;
  readonly name = "InvalidTokenAccountOwner";
  readonly msg = "Account is not owned by the token program";

  constructor(readonly logs?: string[]) {
    super("6041: Account is not owned by the token program");
  }
}

export class InvalidAccount extends Error {
  static readonly code = 6042;
  readonly code = 6042;
  readonly name = "InvalidAccount";
  readonly msg = "Account is not a valid token account";

  constructor(readonly logs?: string[]) {
    super("6042: Account is not a valid token account");
  }
}

export class InvalidTokenMint extends Error {
  static readonly code = 6043;
  readonly code = 6043;
  readonly name = "InvalidTokenMint";
  readonly msg = "Token account has incorrect mint";

  constructor(readonly logs?: string[]) {
    super("6043: Token account has incorrect mint");
  }
}

export class InvalidTokenAuthority extends Error {
  static readonly code = 6044;
  readonly code = 6044;
  readonly name = "InvalidTokenAuthority";
  readonly msg = "Token account has incorrect authority";

  constructor(readonly logs?: string[]) {
    super("6044: Token account has incorrect authority");
  }
}

export function fromCode(code: number, logs?: string[]): CustomError | null {
  switch (code) {
    case 6000:
      return new OrderCanNotBeCanceled(logs);
    case 6001:
      return new OrderNotActive(logs);
    case 6002:
      return new InvalidAdminAuthority(logs);
    case 6003:
      return new InvalidPdaAuthority(logs);
    case 6004:
      return new InvalidConfigOption(logs);
    case 6005:
      return new InvalidOrderOwner(logs);
    case 6006:
      return new OutOfRangeIntegralConversion(logs);
    case 6007:
      return new InvalidFlag(logs);
    case 6008:
      return new MathOverflow(logs);
    case 6009:
      return new OrderInputAmountInvalid(logs);
    case 6010:
      return new OrderOutputAmountInvalid(logs);
    case 6011:
      return new InvalidHostFee(logs);
    case 6012:
      return new IntegerOverflow(logs);
    case 6013:
      return new InvalidTipBalance(logs);
    case 6014:
      return new InvalidTipTransferAmount(logs);
    case 6015:
      return new InvalidHostTipBalance(logs);
    case 6016:
      return new OrderWithinFlashOperation(logs);
    case 6017:
      return new CPINotAllowed(logs);
    case 6018:
      return new FlashTakeOrderBlocked(logs);
    case 6019:
      return new FlashTxWithUnexpectedIxs(logs);
    case 6020:
      return new FlashIxsNotEnded(logs);
    case 6021:
      return new FlashIxsNotStarted(logs);
    case 6022:
      return new FlashIxsAccountMismatch(logs);
    case 6023:
      return new FlashIxsArgsMismatch(logs);
    case 6024:
      return new OrderNotWithinFlashOperation(logs);
    case 6025:
      return new EmergencyModeEnabled(logs);
    case 6026:
      return new CreatingNewOrdersBlocked(logs);
    case 6027:
      return new OrderTakingBlocked(logs);
    case 6028:
      return new OrderInputAmountTooLarge(logs);
    case 6029:
      return new PermissionRequiredPermissionlessNotEnabled(logs);
    case 6030:
      return new PermissionDoesNotMatchOrder(logs);
    case 6031:
      return new InvalidAtaAddress(logs);
    case 6032:
      return new MakerOutputAtaRequired(logs);
    case 6033:
      return new IntermediaryOutputTokenAccountRequired(logs);
    case 6034:
      return new NotEnoughBalanceForRent(logs);
    case 6035:
      return new NotEnoughTimePassedSinceLastUpdate(logs);
    case 6036:
      return new OrderSameMint(logs);
    case 6037:
      return new UnsupportedTokenExtension(logs);
    case 6038:
      return new InvalidTokenAccount(logs);
    case 6039:
      return new OrderTypeInvalid(logs);
    case 6040:
      return new UninitializedTokenAccount(logs);
    case 6041:
      return new InvalidTokenAccountOwner(logs);
    case 6042:
      return new InvalidAccount(logs);
    case 6043:
      return new InvalidTokenMint(logs);
    case 6044:
      return new InvalidTokenAuthority(logs);
  }

  return null;
}
