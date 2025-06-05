import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh"; // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId";

export interface OrderFields {
  globalConfig: PublicKey;
  maker: PublicKey;
  inputMint: PublicKey;
  inputMintProgramId: PublicKey;
  outputMint: PublicKey;
  outputMintProgramId: PublicKey;
  /** The amount of input token the maker wants to swap */
  initialInputAmount: BN;
  /** The amount of output token the maker wants to receive */
  expectedOutputAmount: BN;
  /** The amount of input token remaining to be swapped */
  remainingInputAmount: BN;
  /** The amount of output token that the maker has received so far */
  filledOutputAmount: BN;
  /**
   * The amount of tips the maker is due to receive for this order -
   * in lamports, stored in the pda_authority account
   */
  tipAmount: BN;
  /** The number of times the order has been filled */
  numberOfFills: BN;
  orderType: number;
  status: number;
  inVaultBump: number;
  /**
   * This is normally set to 0, but can be set to 1 to indicate that the
   * order is part of a flash operation, in whcih case the order can not be
   * modified until the flash operation is completed.
   */
  flashIxLock: number;
  padding0: Array<number>;
  lastUpdatedTimestamp: BN;
  /**
   * This is only used for flash operations, and is set to the blanance on the start
   * operation, and than back to 0 on the end operation. It is used to compute the difference
   * between start and end balances in order to compute the amount received from a potential swap
   */
  flashStartTakerOutputBalance: BN;
  padding: Array<BN>;
}

export interface OrderJSON {
  globalConfig: string;
  maker: string;
  inputMint: string;
  inputMintProgramId: string;
  outputMint: string;
  outputMintProgramId: string;
  /** The amount of input token the maker wants to swap */
  initialInputAmount: string;
  /** The amount of output token the maker wants to receive */
  expectedOutputAmount: string;
  /** The amount of input token remaining to be swapped */
  remainingInputAmount: string;
  /** The amount of output token that the maker has received so far */
  filledOutputAmount: string;
  /**
   * The amount of tips the maker is due to receive for this order -
   * in lamports, stored in the pda_authority account
   */
  tipAmount: string;
  /** The number of times the order has been filled */
  numberOfFills: string;
  orderType: number;
  status: number;
  inVaultBump: number;
  /**
   * This is normally set to 0, but can be set to 1 to indicate that the
   * order is part of a flash operation, in whcih case the order can not be
   * modified until the flash operation is completed.
   */
  flashIxLock: number;
  padding0: Array<number>;
  lastUpdatedTimestamp: string;
  /**
   * This is only used for flash operations, and is set to the blanance on the start
   * operation, and than back to 0 on the end operation. It is used to compute the difference
   * between start and end balances in order to compute the amount received from a potential swap
   */
  flashStartTakerOutputBalance: string;
  padding: Array<string>;
}

export class Order {
  readonly globalConfig: PublicKey;
  readonly maker: PublicKey;
  readonly inputMint: PublicKey;
  readonly inputMintProgramId: PublicKey;
  readonly outputMint: PublicKey;
  readonly outputMintProgramId: PublicKey;
  /** The amount of input token the maker wants to swap */
  readonly initialInputAmount: BN;
  /** The amount of output token the maker wants to receive */
  readonly expectedOutputAmount: BN;
  /** The amount of input token remaining to be swapped */
  readonly remainingInputAmount: BN;
  /** The amount of output token that the maker has received so far */
  readonly filledOutputAmount: BN;
  /**
   * The amount of tips the maker is due to receive for this order -
   * in lamports, stored in the pda_authority account
   */
  readonly tipAmount: BN;
  /** The number of times the order has been filled */
  readonly numberOfFills: BN;
  readonly orderType: number;
  readonly status: number;
  readonly inVaultBump: number;
  /**
   * This is normally set to 0, but can be set to 1 to indicate that the
   * order is part of a flash operation, in whcih case the order can not be
   * modified until the flash operation is completed.
   */
  readonly flashIxLock: number;
  readonly padding0: Array<number>;
  readonly lastUpdatedTimestamp: BN;
  /**
   * This is only used for flash operations, and is set to the blanance on the start
   * operation, and than back to 0 on the end operation. It is used to compute the difference
   * between start and end balances in order to compute the amount received from a potential swap
   */
  readonly flashStartTakerOutputBalance: BN;
  readonly padding: Array<BN>;

  static readonly discriminator = Buffer.from([
    134, 173, 223, 185, 77, 86, 28, 51,
  ]);

  static readonly layout = borsh.struct([
    borsh.publicKey("globalConfig"),
    borsh.publicKey("maker"),
    borsh.publicKey("inputMint"),
    borsh.publicKey("inputMintProgramId"),
    borsh.publicKey("outputMint"),
    borsh.publicKey("outputMintProgramId"),
    borsh.u64("initialInputAmount"),
    borsh.u64("expectedOutputAmount"),
    borsh.u64("remainingInputAmount"),
    borsh.u64("filledOutputAmount"),
    borsh.u64("tipAmount"),
    borsh.u64("numberOfFills"),
    borsh.u8("orderType"),
    borsh.u8("status"),
    borsh.u8("inVaultBump"),
    borsh.u8("flashIxLock"),
    borsh.array(borsh.u8(), 4, "padding0"),
    borsh.u64("lastUpdatedTimestamp"),
    borsh.u64("flashStartTakerOutputBalance"),
    borsh.array(borsh.u64(), 19, "padding"),
  ]);

  constructor(fields: OrderFields) {
    this.globalConfig = fields.globalConfig;
    this.maker = fields.maker;
    this.inputMint = fields.inputMint;
    this.inputMintProgramId = fields.inputMintProgramId;
    this.outputMint = fields.outputMint;
    this.outputMintProgramId = fields.outputMintProgramId;
    this.initialInputAmount = fields.initialInputAmount;
    this.expectedOutputAmount = fields.expectedOutputAmount;
    this.remainingInputAmount = fields.remainingInputAmount;
    this.filledOutputAmount = fields.filledOutputAmount;
    this.tipAmount = fields.tipAmount;
    this.numberOfFills = fields.numberOfFills;
    this.orderType = fields.orderType;
    this.status = fields.status;
    this.inVaultBump = fields.inVaultBump;
    this.flashIxLock = fields.flashIxLock;
    this.padding0 = fields.padding0;
    this.lastUpdatedTimestamp = fields.lastUpdatedTimestamp;
    this.flashStartTakerOutputBalance = fields.flashStartTakerOutputBalance;
    this.padding = fields.padding;
  }

  static async fetch(
    c: Connection,
    address: PublicKey,
    programId: PublicKey = PROGRAM_ID,
  ): Promise<Order | null> {
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
  ): Promise<Array<Order | null>> {
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

  static decode(data: Buffer): Order {
    if (!data.slice(0, 8).equals(Order.discriminator)) {
      throw new Error("invalid account discriminator");
    }

    const dec = Order.layout.decode(data.slice(8));

    return new Order({
      globalConfig: dec.globalConfig,
      maker: dec.maker,
      inputMint: dec.inputMint,
      inputMintProgramId: dec.inputMintProgramId,
      outputMint: dec.outputMint,
      outputMintProgramId: dec.outputMintProgramId,
      initialInputAmount: dec.initialInputAmount,
      expectedOutputAmount: dec.expectedOutputAmount,
      remainingInputAmount: dec.remainingInputAmount,
      filledOutputAmount: dec.filledOutputAmount,
      tipAmount: dec.tipAmount,
      numberOfFills: dec.numberOfFills,
      orderType: dec.orderType,
      status: dec.status,
      inVaultBump: dec.inVaultBump,
      flashIxLock: dec.flashIxLock,
      padding0: dec.padding0,
      lastUpdatedTimestamp: dec.lastUpdatedTimestamp,
      flashStartTakerOutputBalance: dec.flashStartTakerOutputBalance,
      padding: dec.padding,
    });
  }

  toJSON(): OrderJSON {
    return {
      globalConfig: this.globalConfig.toString(),
      maker: this.maker.toString(),
      inputMint: this.inputMint.toString(),
      inputMintProgramId: this.inputMintProgramId.toString(),
      outputMint: this.outputMint.toString(),
      outputMintProgramId: this.outputMintProgramId.toString(),
      initialInputAmount: this.initialInputAmount.toString(),
      expectedOutputAmount: this.expectedOutputAmount.toString(),
      remainingInputAmount: this.remainingInputAmount.toString(),
      filledOutputAmount: this.filledOutputAmount.toString(),
      tipAmount: this.tipAmount.toString(),
      numberOfFills: this.numberOfFills.toString(),
      orderType: this.orderType,
      status: this.status,
      inVaultBump: this.inVaultBump,
      flashIxLock: this.flashIxLock,
      padding0: this.padding0,
      lastUpdatedTimestamp: this.lastUpdatedTimestamp.toString(),
      flashStartTakerOutputBalance:
        this.flashStartTakerOutputBalance.toString(),
      padding: this.padding.map((item) => item.toString()),
    };
  }

  static fromJSON(obj: OrderJSON): Order {
    return new Order({
      globalConfig: new PublicKey(obj.globalConfig),
      maker: new PublicKey(obj.maker),
      inputMint: new PublicKey(obj.inputMint),
      inputMintProgramId: new PublicKey(obj.inputMintProgramId),
      outputMint: new PublicKey(obj.outputMint),
      outputMintProgramId: new PublicKey(obj.outputMintProgramId),
      initialInputAmount: new BN(obj.initialInputAmount),
      expectedOutputAmount: new BN(obj.expectedOutputAmount),
      remainingInputAmount: new BN(obj.remainingInputAmount),
      filledOutputAmount: new BN(obj.filledOutputAmount),
      tipAmount: new BN(obj.tipAmount),
      numberOfFills: new BN(obj.numberOfFills),
      orderType: obj.orderType,
      status: obj.status,
      inVaultBump: obj.inVaultBump,
      flashIxLock: obj.flashIxLock,
      padding0: obj.padding0,
      lastUpdatedTimestamp: new BN(obj.lastUpdatedTimestamp),
      flashStartTakerOutputBalance: new BN(obj.flashStartTakerOutputBalance),
      padding: obj.padding.map((item) => new BN(item)),
    });
  }
}
