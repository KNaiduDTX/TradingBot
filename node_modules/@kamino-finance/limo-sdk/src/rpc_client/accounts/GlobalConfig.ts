import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface GlobalConfigFields {
  emergencyMode: number;
  flashTakeOrderBlocked: number;
  newOrdersBlocked: number;
  ordersTakingBlocked: number;
  hostFeeBps: number;
  isOrderTakingPermissionless: number;
  padding0: Array<number>;
  /** The number of seconds after an order has been updated before it can be closed */
  orderCloseDelaySeconds: BN;
  padding1: Array<BN>;
  /**
   * The total amount of lamports that were present in the pda_authority last
   * time a program instructions which alters the pda_authority account was
   * executed
   */
  pdaAuthorityPreviousLamportsBalance: BN;
  /**
   * The total amount of tips that have been paid out - should be at least
   * as much as the total lamports present in the pda_authority account
   */
  totalTipAmount: BN;
  /**
   * The amount of tips the host is due to receive -
   * in lamports, stored in the pda_authority account
   */
  hostTipAmount: BN;
  pdaAuthority: PublicKey;
  pdaAuthorityBump: BN;
  adminAuthority: PublicKey;
  adminAuthorityCached: PublicKey;
  txnFeeCost: BN;
  ataCreationCost: BN;
  padding2: Array<BN>;
}

export interface GlobalConfigJSON {
  emergencyMode: number;
  flashTakeOrderBlocked: number;
  newOrdersBlocked: number;
  ordersTakingBlocked: number;
  hostFeeBps: number;
  isOrderTakingPermissionless: number;
  padding0: Array<number>;
  /** The number of seconds after an order has been updated before it can be closed */
  orderCloseDelaySeconds: string;
  padding1: Array<string>;
  /**
   * The total amount of lamports that were present in the pda_authority last
   * time a program instructions which alters the pda_authority account was
   * executed
   */
  pdaAuthorityPreviousLamportsBalance: string;
  /**
   * The total amount of tips that have been paid out - should be at least
   * as much as the total lamports present in the pda_authority account
   */
  totalTipAmount: string;
  /**
   * The amount of tips the host is due to receive -
   * in lamports, stored in the pda_authority account
   */
  hostTipAmount: string;
  pdaAuthority: string;
  pdaAuthorityBump: string;
  adminAuthority: string;
  adminAuthorityCached: string;
  txnFeeCost: string;
  ataCreationCost: string;
  padding2: Array<string>;
}

export class GlobalConfig {
  readonly emergencyMode: number;
  readonly flashTakeOrderBlocked: number;
  readonly newOrdersBlocked: number;
  readonly ordersTakingBlocked: number;
  readonly hostFeeBps: number;
  readonly isOrderTakingPermissionless: number;
  readonly padding0: Array<number>;
  /** The number of seconds after an order has been updated before it can be closed */
  readonly orderCloseDelaySeconds: BN;
  readonly padding1: Array<BN>;
  /**
   * The total amount of lamports that were present in the pda_authority last
   * time a program instructions which alters the pda_authority account was
   * executed
   */
  readonly pdaAuthorityPreviousLamportsBalance: BN;
  /**
   * The total amount of tips that have been paid out - should be at least
   * as much as the total lamports present in the pda_authority account
   */
  readonly totalTipAmount: BN;
  /**
   * The amount of tips the host is due to receive -
   * in lamports, stored in the pda_authority account
   */
  readonly hostTipAmount: BN;
  readonly pdaAuthority: PublicKey;
  readonly pdaAuthorityBump: BN;
  readonly adminAuthority: PublicKey;
  readonly adminAuthorityCached: PublicKey;
  readonly txnFeeCost: BN;
  readonly ataCreationCost: BN;
  readonly padding2: Array<BN>;

  static readonly discriminator = Buffer.from([
    149, 8, 156, 202, 160, 252, 176, 217,
  ]);

  static readonly layout = borsh.struct([
    borsh.u8("emergencyMode"),
    borsh.u8("flashTakeOrderBlocked"),
    borsh.u8("newOrdersBlocked"),
    borsh.u8("ordersTakingBlocked"),
    borsh.u16("hostFeeBps"),
    borsh.u8("isOrderTakingPermissionless"),
    borsh.array(borsh.u8(), 1, "padding0"),
    borsh.u64("orderCloseDelaySeconds"),
    borsh.array(borsh.u64(), 9, "padding1"),
    borsh.u64("pdaAuthorityPreviousLamportsBalance"),
    borsh.u64("totalTipAmount"),
    borsh.u64("hostTipAmount"),
    borsh.publicKey("pdaAuthority"),
    borsh.u64("pdaAuthorityBump"),
    borsh.publicKey("adminAuthority"),
    borsh.publicKey("adminAuthorityCached"),
    borsh.u64("txnFeeCost"),
    borsh.u64("ataCreationCost"),
    borsh.array(borsh.u64(), 241, "padding2"),
  ]);

  constructor(fields: GlobalConfigFields) {
    this.emergencyMode = fields.emergencyMode;
    this.flashTakeOrderBlocked = fields.flashTakeOrderBlocked;
    this.newOrdersBlocked = fields.newOrdersBlocked;
    this.ordersTakingBlocked = fields.ordersTakingBlocked;
    this.hostFeeBps = fields.hostFeeBps;
    this.isOrderTakingPermissionless = fields.isOrderTakingPermissionless;
    this.padding0 = fields.padding0;
    this.orderCloseDelaySeconds = fields.orderCloseDelaySeconds;
    this.padding1 = fields.padding1;
    this.pdaAuthorityPreviousLamportsBalance =
      fields.pdaAuthorityPreviousLamportsBalance;
    this.totalTipAmount = fields.totalTipAmount;
    this.hostTipAmount = fields.hostTipAmount;
    this.pdaAuthority = fields.pdaAuthority;
    this.pdaAuthorityBump = fields.pdaAuthorityBump;
    this.adminAuthority = fields.adminAuthority;
    this.adminAuthorityCached = fields.adminAuthorityCached;
    this.txnFeeCost = fields.txnFeeCost;
    this.ataCreationCost = fields.ataCreationCost;
    this.padding2 = fields.padding2;
  }

  static async fetch(
    c: Connection,
    address: PublicKey,
    programId: PublicKey = PROGRAM_ID,
  ): Promise<GlobalConfig | null> {
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
  ): Promise<Array<GlobalConfig | null>> {
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

  static decode(data: Buffer): GlobalConfig {
    if (!data.slice(0, 8).equals(GlobalConfig.discriminator)) {
      throw new Error("invalid account discriminator");
    }

    const dec = GlobalConfig.layout.decode(data.slice(8));

    return new GlobalConfig({
      emergencyMode: dec.emergencyMode,
      flashTakeOrderBlocked: dec.flashTakeOrderBlocked,
      newOrdersBlocked: dec.newOrdersBlocked,
      ordersTakingBlocked: dec.ordersTakingBlocked,
      hostFeeBps: dec.hostFeeBps,
      isOrderTakingPermissionless: dec.isOrderTakingPermissionless,
      padding0: dec.padding0,
      orderCloseDelaySeconds: dec.orderCloseDelaySeconds,
      padding1: dec.padding1,
      pdaAuthorityPreviousLamportsBalance:
        dec.pdaAuthorityPreviousLamportsBalance,
      totalTipAmount: dec.totalTipAmount,
      hostTipAmount: dec.hostTipAmount,
      pdaAuthority: dec.pdaAuthority,
      pdaAuthorityBump: dec.pdaAuthorityBump,
      adminAuthority: dec.adminAuthority,
      adminAuthorityCached: dec.adminAuthorityCached,
      txnFeeCost: dec.txnFeeCost,
      ataCreationCost: dec.ataCreationCost,
      padding2: dec.padding2,
    });
  }

  toJSON(): GlobalConfigJSON {
    return {
      emergencyMode: this.emergencyMode,
      flashTakeOrderBlocked: this.flashTakeOrderBlocked,
      newOrdersBlocked: this.newOrdersBlocked,
      ordersTakingBlocked: this.ordersTakingBlocked,
      hostFeeBps: this.hostFeeBps,
      isOrderTakingPermissionless: this.isOrderTakingPermissionless,
      padding0: this.padding0,
      orderCloseDelaySeconds: this.orderCloseDelaySeconds.toString(),
      padding1: this.padding1.map((item) => item.toString()),
      pdaAuthorityPreviousLamportsBalance:
        this.pdaAuthorityPreviousLamportsBalance.toString(),
      totalTipAmount: this.totalTipAmount.toString(),
      hostTipAmount: this.hostTipAmount.toString(),
      pdaAuthority: this.pdaAuthority.toString(),
      pdaAuthorityBump: this.pdaAuthorityBump.toString(),
      adminAuthority: this.adminAuthority.toString(),
      adminAuthorityCached: this.adminAuthorityCached.toString(),
      txnFeeCost: this.txnFeeCost.toString(),
      ataCreationCost: this.ataCreationCost.toString(),
      padding2: this.padding2.map((item) => item.toString()),
    };
  }

  static fromJSON(obj: GlobalConfigJSON): GlobalConfig {
    return new GlobalConfig({
      emergencyMode: obj.emergencyMode,
      flashTakeOrderBlocked: obj.flashTakeOrderBlocked,
      newOrdersBlocked: obj.newOrdersBlocked,
      ordersTakingBlocked: obj.ordersTakingBlocked,
      hostFeeBps: obj.hostFeeBps,
      isOrderTakingPermissionless: obj.isOrderTakingPermissionless,
      padding0: obj.padding0,
      orderCloseDelaySeconds: new BN(obj.orderCloseDelaySeconds),
      padding1: obj.padding1.map((item) => new BN(item)),
      pdaAuthorityPreviousLamportsBalance: new BN(
        obj.pdaAuthorityPreviousLamportsBalance,
      ),
      totalTipAmount: new BN(obj.totalTipAmount),
      hostTipAmount: new BN(obj.hostTipAmount),
      pdaAuthority: new PublicKey(obj.pdaAuthority),
      pdaAuthorityBump: new BN(obj.pdaAuthorityBump),
      adminAuthority: new PublicKey(obj.adminAuthority),
      adminAuthorityCached: new PublicKey(obj.adminAuthorityCached),
      txnFeeCost: new BN(obj.txnFeeCost),
      ataCreationCost: new BN(obj.ataCreationCost),
      padding2: obj.padding2.map((item) => new BN(item)),
    });
  }
}
