import { AnchorProvider, Idl, Program, Provider } from "@coral-xyz/anchor";
import LIMO_IDL from "./rpc_client/limo.json";
import BN from "bn.js";

import {
  Connection,
  Context,
  GetProgramAccountsFilter,
  KeyedAccountInfo,
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import {
  getReadOnlyWallet,
  getPdaAuthority,
  createKeypairRentExemptIxSync,
  getTokenVaultPDA,
  printSimulateTx,
  printMultisigTx,
  OrderStateAndAddress,
  OrderDisplay,
  getMintDecimals,
  PubkeyHashMap,
  withdrawHostTipIx,
  FilledOrder,
  FlashTakeOrderIxs,
  createAtaIdempotent,
  OrderListenerCallbackOnChange,
  createAddExtraComputeUnitFeeTransaction,
  getIntermediaryTokenAccountPDA,
  lamportsToAmountDecimal,
  amountToLamportsBN,
  lamportsToAmountBN,
  divCeil,
  checkIfAccountExists,
  getEventAuthorityPDA,
  getUserSwapBalanceStatePDA,
} from "./utils";

import * as limoOperations from "./utils/operations";
import { Keypair } from "@solana/web3.js";
import { GlobalConfig } from "./rpc_client/accounts/GlobalConfig";
import Decimal from "decimal.js";
import { Order } from "./rpc_client/accounts/Order";
import { UpdateGlobalConfigMode } from "./rpc_client/types";
import {
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createCloseAccountInstruction } from "@solana/spl-token";
import base58 from "bs58";
import { logUserSwapBalancesStart } from "./rpc_client/instructions";
import { logUserSwapBalancesEnd } from "./rpc_client/instructions";

export const limoId = new PublicKey(
  "LiMoM9rMhrdYrfzUCxQppvxCSG1FcrUK9G8uLq4A1GF",
);

export const WRAPPED_SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112",
);

export const ORDER_RENT_EXEMPTION_LAMPORTS = 3841920;
export const MAX_CLOSE_ORDER_AND_CLAIM_TIP_ORDERS_IN_TX = 14;

export class LimoClient {
  private readonly _connection: Connection;
  private readonly _provider: Provider;
  private readonly _limoProgram: Program;
  private readonly programId: PublicKey;
  private globalConfigState: GlobalConfig | undefined;
  private _globalConfig: PublicKey;

  constructor(
    connection: Connection,
    globalConfig: PublicKey | undefined,
    globalConfigState?: GlobalConfig,
  ) {
    this._connection = connection;
    this._globalConfig = globalConfig ?? PublicKey.default;
    this._provider = new AnchorProvider(connection, getReadOnlyWallet(), {
      commitment: connection.commitment,
    });
    this.programId = limoId;
    this._limoProgram = new Program(
      LIMO_IDL as Idl,
      this.programId,
      this._provider,
    );
    this.globalConfigState = globalConfigState;
  }

  getConnection() {
    return this._connection;
  }

  getProgramID() {
    return this.programId;
  }

  getProgram() {
    return this._limoProgram;
  }

  /**
   * Sets the global config address
   * @param globalConfig - the global config address
   */
  setGlobalConfig(globalConfig: PublicKey) {
    this._globalConfig = globalConfig;
  }

  /**
   * Refresh and get the global config state
   * @returns the global config state
   * @throws error if global config not set
   */
  async refreshGlobalConfigState() {
    if (!this._globalConfig) {
      throw new Error("Global Config not set");
    }
    const globalConfigState = await GlobalConfig.fetch(
      this._connection,
      this._globalConfig,
    );
    if (!globalConfigState) {
      throw new Error("Global Config not found");
    }
    this.globalConfigState = globalConfigState;
    return this.globalConfigState;
  }

  /**
   * Get the global config state
   * @returns the global config state
   * @throws error if global config not set
   */
  async getGlobalConfigState() {
    if (!this._globalConfig) {
      throw new Error("Global Config not set");
    }
    if (!this.globalConfigState) {
      const globalConfigState = await GlobalConfig.fetch(
        this._connection,
        this._globalConfig,
      );
      if (!globalConfigState) {
        throw new Error("Global Config not found");
      }
      this.globalConfigState = globalConfigState;
    }
    return this.globalConfigState;
  }

  /**
   * Get the global config state synchronously
   * @returns the global config state
   * @throws error if global config not set
   * @throws error if global config state not fetched yet
   */
  getGlobalConfigStateSync() {
    if (!this._globalConfig) {
      throw new Error("Global Config not set");
    }
    if (!this.globalConfigState) {
      throw new Error(
        "Global Config state not fetched yet, use getGlobalConfigState",
      );
    }
    return this.globalConfigState;
  }

  /**
   * Get the given order state
   * @param orderAddress - the order address
   * @returns the order state
   */
  async getOrderState(orderAddress: PublicKey): Promise<Order> {
    const order = await Order.fetch(
      this._connection,
      orderAddress,
      this.programId,
    );

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  }

  /**
   * Gets all orders with given filters
   * @param filters - list of filters to apply to the get program accounts
   * @param globalConfigOverride - global config override to filter by
   * @param filterByGlobalConfig - whether to filter by global config or not
   * @returns list of order states and addresses
   */
  async getAllOrdersStateAndAddressWithFilters(
    filters: GetProgramAccountsFilter[],
    globalConfigOverride?: PublicKey,
    filterByGlobalConfig: boolean = true,
  ): Promise<OrderStateAndAddress[]> {
    if (filterByGlobalConfig) {
      filters.push({
        memcmp: {
          bytes: globalConfigOverride
            ? globalConfigOverride.toBase58()
            : this._globalConfig.toBase58(),
          offset: 8,
        },
      });
    }
    filters.push({
      dataSize: Order.layout.span + 8,
    });
    const orderProgramAccounts = await this._connection.getProgramAccounts(
      this.programId,
      {
        filters,
      },
    );

    return orderProgramAccounts.map((orderProgramAccount) => {
      if (orderProgramAccount.account === null) {
        throw new Error("Invalid account");
      }
      if (!orderProgramAccount.account.owner.equals(this.programId)) {
        throw new Error("account doesn't belong to this program");
      }

      const order = Order.decode(orderProgramAccount.account.data);

      if (!order) {
        throw Error("Could not parse obligation.");
      }

      return {
        state: order,
        address: orderProgramAccount.pubkey,
      };
    });
  }

  /**
   * Gets all orders for global config
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order states and addresses
   * @throws error if global config not set
   */
  async getAllOrdersStateAndAddressForGlobalConfig(
    globalConfigOverride?: PublicKey,
  ): Promise<OrderStateAndAddress[]> {
    return this.getAllOrdersStateAndAddressWithFilters(
      [],
      globalConfigOverride,
    );
  }

  /**
   * Gets all orders for global config and returns them as OrderDisplay
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order displays
   * @throws error if global config not set
   * @throws error if mint decimals not found for mint
   */
  async getAllOrdersDisplayForGlobalConfig(
    mintDecimals: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<OrderDisplay[]> {
    const ordersAndStates = await this.getAllOrdersStateAndAddressWithFilters(
      [],
      globalConfigOverride,
    );

    return this.toOrdersDisplay(ordersAndStates, mintDecimals);
  }

  /**
   * Gets all orders for a specific maker
   * @param maker - maker address
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order states and addresses
   * @throws error if global config not set
   * @throws error if mint decimals not found for mint
   */
  async getAllOrdersStateAndAddressForMaker(
    maker: PublicKey,
    globalConfigOverride?: PublicKey,
  ): Promise<OrderStateAndAddress[]> {
    const filters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: maker.toBase58(),
          offset: 40,
        },
      },
    ];

    return this.getAllOrdersStateAndAddressWithFilters(
      filters,
      globalConfigOverride,
    );
  }

  /**
   * Gets all orders for a specific maker and returns them as OrderDisplay
   * @param maker - maker address
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order displays
   * @throws error if global config not set
   * @throws error if mint decimals not found for mint
   */
  async getAllOrdersDisplayForMaker(
    maker: PublicKey,
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<OrderDisplay[]> {
    const ordersAndStates = await this.getAllOrdersStateAndAddressForMaker(
      maker,
      globalConfigOverride,
    );

    const mints: PublicKey[] = [];
    for (const order of ordersAndStates) {
      mints.push(order.state.inputMint);
      mints.push(order.state.outputMint);
    }

    let ordersMintDecimals =
      mintDecimals ?? (await this.getMintDecimals(mints));

    return this.toOrdersDisplay(ordersAndStates, ordersMintDecimals);
  }

  /**
   * Gets all orders for a specific input mint
   * @param inputMint - input mint address
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order states and addresses
   * @throws error if global config not set
   */
  async getAllOrdersStateAndAddressForInputMint(
    inputMint: PublicKey,
    globalConfigOverride?: PublicKey,
  ): Promise<OrderStateAndAddress[]> {
    const filters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: inputMint.toBase58(),
          offset: 72,
        },
      },
    ];

    return this.getAllOrdersStateAndAddressWithFilters(
      filters,
      globalConfigOverride,
    );
  }

  /**
   * Gets all orders for a specific input mint and returns them as OrderDisplay
   * @param inputMint - input mint address
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order displays
   * @throws error if global config not set
   */
  async getAllOrdersDisplayForInputMint(
    inputMint: PublicKey,
    mintDecimals: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<OrderDisplay[]> {
    const ordersAndStates = await this.getAllOrdersStateAndAddressForInputMint(
      inputMint,
      globalConfigOverride,
    );

    return this.toOrdersDisplay(ordersAndStates, mintDecimals);
  }

  /**
   * Gets all orders for a specific output mint
   * @param outputMint - output mint address
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order states and addresses
   * @throws error if global config not set
   */
  async getAllOrdersStateAndAddressForOutputMint(
    outputMint: PublicKey,
    globalConfigOverride?: PublicKey,
  ): Promise<OrderStateAndAddress[]> {
    const filters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: outputMint.toBase58(),
          offset: 136,
        },
      },
    ];

    return this.getAllOrdersStateAndAddressWithFilters(
      filters,
      globalConfigOverride,
    );
  }

  /**
   * Gets all orders for a specific output mint and returns them as OrderDisplay
   * @param outputMint - output mint address
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order displays
   * @throws error if global config not set
   */
  async getAllOrdersDisplayForOutputMint(
    outputMint: PublicKey,
    mintDecimals: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<OrderDisplay[]> {
    const ordersAndStates = await this.getAllOrdersStateAndAddressForOutputMint(
      outputMint,
      globalConfigOverride,
    );

    return this.toOrdersDisplay(ordersAndStates, mintDecimals);
  }

  /**
   * Gets all orders for a specific input and output mint
   * @param inputMint - input mint address
   * @param outputMint - output mint address
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order states and addresses
   * @throws error if global config not set
   */
  async getAllOrdersDisplayForInputAndOutputMints(
    inputMint: PublicKey,
    outputMint: PublicKey,
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<OrderDisplay[]> {
    const filters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: inputMint.toBase58(),
          offset: 72,
        },
      },
      {
        memcmp: {
          bytes: outputMint.toBase58(),
          offset: 136,
        },
      },
    ];

    const ordersStateAndAddresses =
      await this.getAllOrdersStateAndAddressWithFilters(
        filters,
        globalConfigOverride,
      );

    let mintDecimalsMap = new PubkeyHashMap<PublicKey, number>();

    if (!mintDecimals) {
      const inputMintDecimals = await getMintDecimals(
        this._connection,
        inputMint,
      );
      const outputMintDecimals = await getMintDecimals(
        this._connection,
        outputMint,
      );

      mintDecimalsMap.set(inputMint, inputMintDecimals);
      mintDecimalsMap.set(outputMint, outputMintDecimals);
    } else {
      mintDecimalsMap = mintDecimals;
    }

    return this.toOrdersDisplay(ordersStateAndAddresses, mintDecimalsMap);
  }

  /**
   * Gets all orders for a specific maker, input and output mint
   * @param maker - maker address
   * @param inputMint - input mint address
   * @param outputMint - output mint address
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param globalConfigOverride - global config override to filter by
   * @returns list of order displays
   * @throws error if global config not set
   * @throws error if mint decimals not found for mint
   */
  async getAllOrdersDisplayForMakerInputAndOutputMints(
    maker: PublicKey,
    inputMint: PublicKey,
    outputMint: PublicKey,
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<OrderDisplay[]> {
    // Global config filter is always happening in getAllOrdersStateAndAddressWithFilters
    // but max of 4 filters are allowed so we merge maker and inputMint as they are
    // consecutive pubkeys in the order account maker at byte 40 and input mint at byte 72

    const mergedMakerInputMint = Buffer.concat([
      new Uint8Array(maker.toBuffer()),
      new Uint8Array(inputMint.toBuffer()),
    ]);

    const filters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: base58.encode(mergedMakerInputMint),
          offset: 40,
        },
      },
      {
        memcmp: {
          bytes: outputMint.toBase58(),
          offset: 136,
        },
      },
    ];

    const ordersStateAndAddresses =
      await this.getAllOrdersStateAndAddressWithFilters(
        filters,
        globalConfigOverride,
      );

    let mintDecimalsMap = new PubkeyHashMap<PublicKey, number>();

    if (mintDecimals) {
      const inputMintDecimals = await getMintDecimals(
        this._connection,
        inputMint,
      );
      const outputMintDecimals = await getMintDecimals(
        this._connection,
        outputMint,
      );

      mintDecimalsMap.set(inputMint, inputMintDecimals);
      mintDecimalsMap.set(outputMint, outputMintDecimals);
    }

    return this.toOrdersDisplay(ordersStateAndAddresses, mintDecimalsMap);
  }

  async getOrderDisplay(orderAddress: PublicKey): Promise<OrderDisplay> {
    const order = await Order.fetch(
      this._connection,
      orderAddress,
      this.programId,
    );

    if (!order) {
      throw new Error("Order not found");
    }

    const inputMintDecimals = await getMintDecimals(
      this._connection,
      order.inputMint,
    );
    const outputMintDecimals = await getMintDecimals(
      this._connection,
      order.outputMint,
    );

    const mintDecimalsMap = new PubkeyHashMap<PublicKey, number>();

    mintDecimalsMap.set(order.inputMint, inputMintDecimals);
    mintDecimalsMap.set(order.outputMint, outputMintDecimals);

    return this.toOrdersDisplay(
      [{ address: orderAddress, state: order }],
      mintDecimalsMap,
    )[0];
  }

  /**
   * Converts order states and addresses to order displays
   * @param orders - list of order states and addresses
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @returns list of order displays
   * @throws error if mint decimals not found for mint
   */
  toOrdersDisplay(
    orders: OrderStateAndAddress[],
    mintDecimals: PubkeyHashMap<PublicKey, number>,
  ): OrderDisplay[] {
    const ordersDisplay: OrderDisplay[] = [];
    for (const order of orders) {
      const inputMintDecimals = mintDecimals.get(order.state.inputMint);
      if (!inputMintDecimals) {
        throw new Error(
          "Mint decimals not found for mint + " +
            order.state.inputMint.toBase58(),
        );
      }
      const outputMintDecimals = mintDecimals.get(order.state.outputMint);
      if (!outputMintDecimals) {
        throw new Error(
          "Mint decimals not found for mint + " +
            order.state.outputMint.toBase58(),
        );
      }
      const initialInputAmountDecimal = new Decimal(
        order.state.initialInputAmount.toString(),
      ).div(new Decimal(10).pow(inputMintDecimals));

      const expectedOutputAmountDecimal = new Decimal(
        order.state.expectedOutputAmount.toString(),
      ).div(new Decimal(10).pow(outputMintDecimals));

      const remainingInputAmountDecimal = new Decimal(
        order.state.remainingInputAmount.toString(),
      ).div(new Decimal(10).pow(inputMintDecimals));

      const filledOutputAmountDecimal = new Decimal(
        order.state.filledOutputAmount.toString(),
      ).div(new Decimal(10).pow(outputMintDecimals));

      const orderFillPct = initialInputAmountDecimal
        .sub(remainingInputAmountDecimal)
        .div(initialInputAmountDecimal);

      const orderTipLamports = new Decimal(order.state.tipAmount.toString());
      const orderTipDecimal = lamportsToAmountDecimal(orderTipLamports, 9); // tip is native sol which

      ordersDisplay.push({
        address: order.address,
        state: order.state,
        maker: order.state.maker,
        initialInputAmountDecimal,
        expectedOutputAmountDecimal,
        remainingInputAmountDecimal,
        filledOutputAmountDecimal,
        numberOfFills: order.state.numberOfFills.toNumber(),
        orderFillPct: orderFillPct,
        orderPriceInputToOutput: initialInputAmountDecimal.div(
          expectedOutputAmountDecimal,
        ),
        orderPriceOutputToInput: expectedOutputAmountDecimal.div(
          initialInputAmountDecimal,
        ),
        executionPriceInputToOutput: initialInputAmountDecimal
          .sub(remainingInputAmountDecimal)
          .div(filledOutputAmountDecimal),
        executionPriceOutputToInput: filledOutputAmountDecimal.div(
          initialInputAmountDecimal.sub(remainingInputAmountDecimal),
        ),
        orderTipLamports,
        orderTipDecimal,
      });
    }

    return ordersDisplay;
  }

  /**
   * Returns the ask and bid OrderDisplay arrays for a given base and quote token mint
   * @param baseTokenMint - the base token mint
   * @param quoteTokenMint - the quote token mint
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param globalConfigOverride - global config override to filter by
   * @returns { askOrders: OrderDisplay[], bidOrders: OrderDisplay[] } - the ask and bid orders
   * @throws error if mint decimals not found for mint
   * @throws error if global config not set
   */
  async getOrdersDisplayForBaseAndQuote(
    baseTokenMint: PublicKey,
    quoteTokenMint: PublicKey,
    mintDecimals: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<{ askOrders: OrderDisplay[]; bidOrders: OrderDisplay[] }> {
    const bidOrders = await this.getAllOrdersDisplayForInputAndOutputMints(
      baseTokenMint,
      quoteTokenMint,
      mintDecimals,
      globalConfigOverride,
    );
    const askOrders = await this.getAllOrdersDisplayForInputAndOutputMints(
      quoteTokenMint,
      baseTokenMint,
      mintDecimals,
      globalConfigOverride,
    );

    return {
      bidOrders,
      askOrders,
    };
  }

  /**
   * Returns the ask and bid OrderDisplay arrays for a given base and quote token mint and maker
   * @param maker - the maker address
   * @param baseTokenMint - the base token mint
   * @param quoteTokenMint - the quote token mint
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param globalConfigOverride - global config override to filter by
   * @returns { askOrders: OrderDisplay[], bidOrders: OrderDisplay[] } - the ask and bid orders
   * @throws error if mint decimals not found for mint
   * @throws error if global config not set
   */
  async getOrdersDisplayForBaseAndQuoteAndMaker(
    maker: PublicKey,
    baseTokenMint: PublicKey,
    quoteTokenMint: PublicKey,
    mintDecimals: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<{ askOrders: OrderDisplay[]; bidOrders: OrderDisplay[] }> {
    const bidOrders = await this.getAllOrdersDisplayForMakerInputAndOutputMints(
      maker,
      baseTokenMint,
      quoteTokenMint,
      mintDecimals,
      globalConfigOverride,
    );
    const askOrders = await this.getAllOrdersDisplayForMakerInputAndOutputMints(
      maker,
      quoteTokenMint,
      baseTokenMint,
      mintDecimals,
      globalConfigOverride,
    );

    return {
      bidOrders,
      askOrders,
    };
  }

  /**
   * Returns the sell and buy FilledOrder arrays for a given base and quote token
   * @param baseTokenMint - the base token mint
   * @param quoteTokenMint - the quote token mint
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param globalConfigOverride - global config override to filter by
   * @returns { filledOrdersSell: FilledOrder[], filledOrdersBuy: FilledOrder[] } - the sell and buy filled orders
   * @throws error if mint decimals not found for mint
   * @throws error if global config not set
   */
  async getLatestFilledOrders(
    baseTokenMint: PublicKey,
    quoteTokenMint: PublicKey,
    mintDecimals: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<{
    filledOrdersBuy: FilledOrder[];
    filledOrdersSell: FilledOrder[];
  }> {
    const { askOrders, bidOrders } = await this.getOrdersDisplayForBaseAndQuote(
      baseTokenMint,
      quoteTokenMint,
      mintDecimals,
      globalConfigOverride,
    );
    const filledOrdersSell: FilledOrder[] = [];
    const filledOrdersBuy: FilledOrder[] = [];

    for (const order of askOrders) {
      if (
        order.state.remainingInputAmount.toNumber() <
        order.state.initialInputAmount.toNumber()
      ) {
        filledOrdersSell.push({
          address: order.address,
          orderDisplay: order,
          quoteTokenMint: quoteTokenMint,
          baseTokenMint: baseTokenMint,
          time: order.state.lastUpdatedTimestamp.toNumber(),
          price: order.executionPriceOutputToInput,
          size: order.filledOutputAmountDecimal,
          txid: "N/A",
          type: "sell",
        });
      }
    }

    for (const order of bidOrders) {
      if (
        order.state.remainingInputAmount.toNumber() <
        order.state.initialInputAmount.toNumber()
      ) {
        filledOrdersBuy.push({
          address: order.address,
          orderDisplay: order,
          quoteTokenMint: quoteTokenMint,
          baseTokenMint: baseTokenMint,
          time: order.state.lastUpdatedTimestamp.toNumber(),
          price: order.executionPriceInputToOutput,
          size: order.filledOutputAmountDecimal,
          txid: "N/A",
          type: "buy",
        });
      }
    }

    // sort by filledTimestamp
    filledOrdersBuy.sort((a, b) => -(a.time - b.time));
    filledOrdersSell.sort((a, b) => -(a.time - b.time));

    return { filledOrdersBuy, filledOrdersSell };
  }

  /**
   * Starts listening to order changes for a specific maker
   * @param maker - the maker address
   * @param callbackOnChange - callback to be called when an order changes
   * @returns subscriptionId - a number of the subscription id, to be used to stop the listener
   */
  listenToMakerOrders(
    maker: PublicKey,
    callbackOnChange: OrderListenerCallbackOnChange,
  ): number {
    const filters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: maker.toBase58(),
          offset: 40,
        },
      },
    ];

    const subscriptionId = this.listenToOrdersChangeWithFilters(
      filters,
      callbackOnChange,
    );

    return subscriptionId;
  }

  /**
   * Starts listening to order changes with 2 separate listeners, one for sell orders and one for buy orders
   * @param baseTokenMint - the base token mint
   * @param quoteTokenMint - the quote token mint
   * @param callbackOnChangeSellOrders - callback to be called when a sell order changes
   * @param callbackOnChangeBuyOrders - callback to be called when a buy order changes
   * @returns { subscriptionIdSellOrders, subscriptionIdBuyOrders } - the subscription id for the two listeners (both should be closed when subscription no longer needed)
   */
  listenToOrderChangeForBaseAndQuote(
    baseTokenMint: PublicKey,
    quoteTokenMint: PublicKey,
    callbackOnChangeSellOrders: OrderListenerCallbackOnChange,
    callbackOnChangeBuyOrders: OrderListenerCallbackOnChange,
  ): { subscriptionIdSellOrders: number; subscriptionIdBuyOrders: number } {
    const buyFilters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: baseTokenMint.toBase58(),
          offset: 72,
        },
      },
      {
        memcmp: {
          bytes: quoteTokenMint.toBase58(),
          offset: 136,
        },
      },
    ];

    const sellFilters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: quoteTokenMint.toBase58(),
          offset: 72,
        },
      },
      {
        memcmp: {
          bytes: baseTokenMint.toBase58(),
          offset: 136,
        },
      },
    ];

    const subscriptionIdSellOrders = this.listenToOrdersChangeWithFilters(
      sellFilters,
      callbackOnChangeSellOrders,
    );
    const subscriptionIdBuyOrders = this.listenToOrdersChangeWithFilters(
      buyFilters,
      callbackOnChangeBuyOrders,
    );

    return { subscriptionIdSellOrders, subscriptionIdBuyOrders };
  }

  /**
   * Starts listening to order changes with 2 separate listeners, one for sell orders and one for buy orders - filter for only filled orders
   * @param baseTokenMint - the base token mint
   * @param quoteTokenMint - the quote token mint
   * @param callbackOnChangeSellOrders - callback to be called when a sell order changes
   * @param callbackOnChangeBuyOrders - callback to be called when a buy order changes
   * @returns { subscriptionIdSellOrders, subscriptionIdBuyOrders } - the subscription id for the two listeners (both should be closed when subscription no longer needed)
   */
  listenToOrderFillChangeForBaseAndQuote(
    baseTokenMint: PublicKey,
    quoteTokenMint: PublicKey,
    callbackOnChangeSellOrders: OrderListenerCallbackOnChange,
    callbackOnChangeBuyOrders: OrderListenerCallbackOnChange,
  ): { subscriptionIdSellOrders: number; subscriptionIdBuyOrders: number } {
    const buyFilters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: baseTokenMint.toBase58(),
          offset: 72,
        },
      },
      {
        memcmp: {
          bytes: quoteTokenMint.toBase58(),
          offset: 136,
        },
      },
    ];

    const sellFilters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          bytes: quoteTokenMint.toBase58(),
          offset: 72,
        },
      },
      {
        memcmp: {
          bytes: baseTokenMint.toBase58(),
          offset: 136,
        },
      },
    ];

    const callbackOnChangeSellOrdersFilledOrdersOnly = (
      orderStateAndAddress: OrderStateAndAddress,
      slot: number,
    ) => {
      if (
        orderStateAndAddress.state.remainingInputAmount.toNumber() <
        orderStateAndAddress.state.initialInputAmount.toNumber()
      ) {
        callbackOnChangeSellOrders(orderStateAndAddress, slot);
      }
    };

    const callbackOnChangeBuyOrdersFilledOrdersOnly = (
      orderStateAndAddress: OrderStateAndAddress,
      slot: number,
    ) => {
      if (
        orderStateAndAddress.state.remainingInputAmount.toNumber() <
        orderStateAndAddress.state.initialInputAmount.toNumber()
      ) {
        callbackOnChangeBuyOrders(orderStateAndAddress, slot);
      }
    };

    const subscriptionIdSellOrders = this.listenToOrdersChangeWithFilters(
      sellFilters,
      callbackOnChangeSellOrdersFilledOrdersOnly,
    );
    const subscriptionIdBuyOrders = this.listenToOrdersChangeWithFilters(
      buyFilters,
      callbackOnChangeBuyOrdersFilledOrdersOnly,
    );

    return { subscriptionIdSellOrders, subscriptionIdBuyOrders };
  }

  /**
   * Starts listening to order changes based on the filters provided, for the global config
   * @param filters - list of filters to apply to the get program accounts
   * @param callbackOnChange - callback to be called when an order changes
   * @returns subscriptionId - a number of the subscription id, to be used to stop the listener
   */
  listenToOrdersChangeWithFilters(
    filters: GetProgramAccountsFilter[],
    callbackOnChange: OrderListenerCallbackOnChange,
  ): number {
    filters.push({
      memcmp: {
        bytes: this._globalConfig.toBase58(),
        offset: 8,
      },
    });
    filters.push({
      dataSize: Order.layout.span + 8,
    });

    const callbackOnChangeWtihDecoding = async (
      keyedAccountInfo: KeyedAccountInfo,
      context: Context,
    ) => {
      if (keyedAccountInfo.accountInfo === null) {
        throw new Error("Invalid account");
      }
      if (!keyedAccountInfo.accountInfo.owner.equals(this.programId)) {
        throw new Error("account doesn't belong to this program");
      }

      const order = Order.decode(keyedAccountInfo.accountInfo.data);

      if (!order) {
        throw Error("Could not parse obligation.");
      }

      callbackOnChange(
        {
          state: order,
          address: keyedAccountInfo.accountId,
        },
        context.slot,
      );
    };

    const subscriptionId = this._connection.onProgramAccountChange(
      this.programId,
      callbackOnChangeWtihDecoding,
      { commitment: "confirmed", encoding: "base64", filters },
    );

    return subscriptionId;
  }

  /**
   * Stops listening to order changes based on the subscription id
   * @param subscriptionId - the subscription id to stop listening to
   */
  stopListeningToOrdersChange(subscriptionId: number) {
    this._connection.removeProgramAccountChangeListener(subscriptionId);
  }

  /**
   * Get the create global config instruction
   * @param admin - the admin address
   * @param globalConfig - the global config keypair
   * @returns the create global config instruction
   */
  async createGlobalConfigIxs(
    admin: PublicKey,
    globalConfig: Keypair,
  ): Promise<TransactionInstruction[]> {
    let ixs: TransactionInstruction[] = [];

    const globalConfigSize = GlobalConfig.layout.getSpan() + 8;

    ixs.push(
      createKeypairRentExemptIxSync(
        admin,
        globalConfig,
        globalConfigSize,
        await this._connection.getMinimumBalanceForRentExemption(
          globalConfigSize,
        ),
        this.programId,
      ),
    );

    const pdaAuthority = getPdaAuthority(
      this.programId,
      globalConfig.publicKey,
    );

    ixs.push(
      limoOperations.initializeGlobalConfig(
        admin,
        globalConfig.publicKey,
        pdaAuthority,
        this.programId,
      ),
    );

    return ixs;
  }

  /**
   * Create the global config
   * @param admin - the admin keypair
   * @param globalConfig - the global config keypair
   * @returns the transaction signature
   */
  async createGlobalConfig(
    admin: Keypair,
    globalConfig: Keypair,
  ): Promise<TransactionSignature> {
    const ix = await this.createGlobalConfigIxs(admin.publicKey, globalConfig);
    const sig = await this.executeTransaction(ix, admin, [globalConfig]);

    if (process.env.DEBUG === "true") {
      console.log("Initialize Global Config txn: " + sig.toString());
    }

    return sig;
  }

  /**
   * Get the create initialize vault instruction
   * @param user - the user address
   * @param mint - the mint address
   * @param mintTokenProgramId - the mint token program id
   * @param globalConfigOverride - the global config override
   * @returns the create initialize vault instruction
   */
  async initializeVaultIx(
    user: PublicKey,
    mint: PublicKey,
    mintTokenProgramId?: PublicKey,
  ): Promise<TransactionInstruction> {
    const mintProgramId = mintTokenProgramId
      ? mintTokenProgramId
      : (await this.getMintsProgramOwners([mint]))[0];

    const globalConfigState = await this.getGlobalConfigState();

    return limoOperations.initializeVault(
      user,
      this._globalConfig,
      mint,
      this.programId,
      mintProgramId,
    );
  }

  /**
   * Initialize the vault
   * @param user - the user keypair
   * @param mint - the mint address
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param mintTokenProgramId - the mint token program id
   * @param globalConfigOverride - the global config override
   * @returns the transaction signature
   */
  async initializeVault(
    user: Keypair,
    mint: PublicKey,
    mode: string = "execute",
    mintTokenProgramId?: PublicKey,
  ): Promise<TransactionSignature> {
    const ix = await this.initializeVaultIx(
      user.publicKey,
      mint,
      mintTokenProgramId,
    );
    const vault = getTokenVaultPDA(this.programId, this._globalConfig, mint);

    const log = "Initialize Vault: " + vault.toString();
    return this.processTxn(user, [ix], mode, log, []);
  }

  /**
   * Get the create initialize order instruction
   * @param user - the user address
   * @param inputMint - the input mint address
   * @param outputMint - the output mint address
   * @param inputAmountLamports - the input amount in lamports
   * @param outputAmountLamports - the output amount in lamports
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @param globalConfigOverride - the global config override
   * @returns the create initialize order instruction and keypair to sign the transaction with
   * @throws error if mint decimals not found for mint
   */
  async createOrderGenericIx(
    user: PublicKey,
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmountLamports: BN,
    outputAmountLamports: BN,
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    globalConfigOverride?: PublicKey,
    wrapUnwrapSol: boolean = true,
    withInitVault?: boolean,
  ): Promise<[TransactionInstruction[], Keypair]> {
    let initVault: boolean;
    if (withInitVault === undefined) {
      try {
        const vaultPda = getTokenVaultPDA(
          this.programId,
          this._globalConfig,
          inputMint,
        );
        initVault = !(await checkIfAccountExists(this._connection, vaultPda));
      } catch (error) {
        initVault = false;
      }
    } else {
      initVault = withInitVault;
    }

    const order = Keypair.generate();
    const orderParams: limoOperations.OrderParams = {
      side: "bid",
      quoteTokenMint: outputMint,
      baseTokenMint: inputMint,
      quoteTokenAmount: outputAmountLamports,
      baseTokenAmount: inputAmountLamports,
    };

    const ixs: TransactionInstruction[] = [];

    if (initVault) {
      ixs.push(
        limoOperations.initializeVault(
          user,
          this._globalConfig,
          inputMint,
          this.programId,
          inputMintProgramId,
        ),
      );
    }

    ixs.push(
      createKeypairRentExemptIxSync(
        user,
        order,
        Order.layout.getSpan() + 8,
        ORDER_RENT_EXEMPTION_LAMPORTS,
        this.programId,
      ),
    );

    const baseTokenMintProgramId = inputMintProgramId;
    const quoteTokenMintProgramId = outputMintProgramId;

    let closeWsolAtaIxs: TransactionInstruction[] = [];
    if (inputMint.equals(WRAPPED_SOL_MINT) && wrapUnwrapSol) {
      const { createIxs, fillIxs, closeIx } =
        this.getInitIfNeededWSOLCreateAndCloseIxs(
          user,
          user,
          inputAmountLamports,
        );
      ixs.push(...createIxs, ...fillIxs);
      closeWsolAtaIxs = closeIx;
    }

    ixs.push(
      limoOperations.createOrder(
        user,
        globalConfigOverride ? globalConfigOverride : this._globalConfig,
        order.publicKey,
        orderParams,
        this.programId,
        baseTokenMintProgramId,
        quoteTokenMintProgramId,
      ),
    );

    ixs.push(...closeWsolAtaIxs);

    return [ixs, order];
  }

  /**
   * Create an order
   * @param user - the user keypair
   * @param inputMint - the input mint address
   * @param outputMint - the output mint address
   * @param inputAmountLamports - the input amount in lamports
   * @param outputAmountLamports - the output amount in lamports
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @param globalConfigOverride - the global config override
   * @returns the transaction signature and the order keypair
   */
  async createOrderGeneric(
    user: Keypair,
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmountLamports: BN,
    outputAmountLamports: BN,
    mode: string = "execute",
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    globalConfigOverride?: PublicKey,
  ): Promise<[TransactionSignature, Keypair]> {
    const [ixs, order] = await this.createOrderGenericIx(
      user.publicKey,
      inputMint,
      outputMint,
      inputAmountLamports,
      outputAmountLamports,
      inputMintProgramId,
      outputMintProgramId,
      globalConfigOverride,
    );

    const log = "Create Order: " + order.publicKey.toString();
    const sig = await this.processTxn(user, ixs, mode, log, [order]);

    return [sig, order];
  }

  /**
   * Place a bid order instruction
   * @param user - the user address
   * @param quoteTokenMint - the quote token mint address
   * @param baseTokenMint - the base token mint address
   * @param baseUiAmount - the base amount in UI
   * @param price - the price
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @param globalConfigOverride - the global config override
   * @returns the create order instruction and keypair to sign the transaction with
   */
  async placeBidIxs(
    user: PublicKey,
    quoteTokenMint: PublicKey,
    baseTokenMint: PublicKey,
    baseUiAmount: Decimal,
    price: Decimal,
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<[TransactionInstruction[], Keypair]> {
    let baseDecimals: number | undefined;
    let quoteDecimals: number | undefined;
    if (mintDecimals) {
      baseDecimals = mintDecimals.get(baseTokenMint);
      quoteDecimals = mintDecimals.get(quoteTokenMint);
    }
    baseDecimals = baseDecimals
      ? baseDecimals
      : await getMintDecimals(this._connection, baseTokenMint);
    quoteDecimals = quoteDecimals
      ? quoteDecimals
      : await getMintDecimals(this._connection, quoteTokenMint);

    return this.createOrderGenericIx(
      user,
      baseTokenMint,
      quoteTokenMint,
      amountToLamportsBN(baseUiAmount, baseDecimals),
      amountToLamportsBN(baseUiAmount.div(price), quoteDecimals),
      inputMintProgramId,
      outputMintProgramId,
      globalConfigOverride,
    );
  }

  /**
   * Place a bid order
   * @param user - the user keypair
   * @param quoteTokenMint - the quote token mint address
   * @param baseTokenMint - the base token mint address
   * @param baseUiAmount - the base amount in UI
   * @param price - the price
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @param globalConfigOverride - the global config override
   * @returns the transaction signature and the order keypair
   */
  async placeBid(
    user: Keypair,
    quoteTokenMint: PublicKey,
    baseTokenMint: PublicKey,
    baseUiAmount: Decimal,
    price: Decimal,
    mode: string = "execute",
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<[TransactionSignature, Keypair]> {
    const [ixs, order] = await this.placeBidIxs(
      user.publicKey,
      quoteTokenMint,
      baseTokenMint,
      baseUiAmount,
      price,
      inputMintProgramId,
      outputMintProgramId,
      mintDecimals,
      globalConfigOverride,
    );

    const log =
      "Place Order: Buy " +
      quoteTokenMint.toString().slice(0, 5) +
      " at price:" +
      price +
      " for " +
      baseUiAmount +
      " " +
      baseTokenMint.toString().slice(0, 5) +
      " Order: " +
      order.publicKey.toString();

    const sig = await this.processTxn(user, ixs, mode, log, [order]);

    return [sig, order];
  }

  /**
   * Place an ask order instruction
   * @param user - the user address
   * @param quoteTokenMint - the quote token mint address
   * @param baseTokenMint - the base token mint address
   * @param quoteUiAmount - the quote amount in UI
   * @param price - the price
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @param globalConfigOverride - the global config override
   * @returns the create order instruction and keypair to sign the transaction with
   */
  async placeAskIxs(
    user: PublicKey,
    quoteTokenMint: PublicKey,
    baseTokenMint: PublicKey,
    quoteUiAmount: Decimal,
    price: Decimal,
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<[TransactionInstruction[], Keypair]> {
    let baseDecimals: number | undefined;
    let quoteDecimals: number | undefined;
    if (mintDecimals) {
      baseDecimals = mintDecimals.get(baseTokenMint);
      quoteDecimals = mintDecimals.get(quoteTokenMint);
    }
    baseDecimals = baseDecimals
      ? baseDecimals
      : await getMintDecimals(this._connection, baseTokenMint);
    quoteDecimals = quoteDecimals
      ? quoteDecimals
      : await getMintDecimals(this._connection, quoteTokenMint);

    return this.createOrderGenericIx(
      user,
      quoteTokenMint,
      baseTokenMint,
      amountToLamportsBN(quoteUiAmount, quoteDecimals),
      amountToLamportsBN(quoteUiAmount.mul(price), baseDecimals),
      inputMintProgramId,
      outputMintProgramId,
      globalConfigOverride,
    );
  }

  /**
   * Place an ask order
   * @param user - the user keypair
   * @param quoteTokenMint - the quote token mint address
   * @param baseTokenMint - the base token mint address
   * @param quoteUiAmount - the quote amount in UI
   * @param price - the price
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @param globalConfigOverride - the global config override
   * @returns the transaction signature and the order keypair
   */
  async placeAsk(
    user: Keypair,
    quoteTokenMint: PublicKey,
    baseTokenMint: PublicKey,
    quoteUiAmount: Decimal,
    price: Decimal,
    mode: string = "execute",
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
    globalConfigOverride?: PublicKey,
  ): Promise<[TransactionSignature, Keypair]> {
    const [ixs, order] = await this.placeAskIxs(
      user.publicKey,
      quoteTokenMint,
      baseTokenMint,
      quoteUiAmount,
      price,
      inputMintProgramId,
      outputMintProgramId,
      mintDecimals,
      globalConfigOverride,
    );

    const log =
      "Place Order: Sell " +
      quoteTokenMint.toString().slice(0, 5) +
      " at price:" +
      price +
      " for " +
      quoteUiAmount +
      " " +
      baseTokenMint.toString().slice(0, 5) +
      " Order: " +
      order.publicKey.toString();

    const sig = await this.processTxn(user, ixs, mode, log, [order]);

    return [sig, order];
  }

  /**
   * Get the create take order instruction
   * @param taker - the taker address
   * @param order - the order state and address
   * @param inputAmountDecimals - the input amount in decimals
   * @param minOutputAmountDecimals - the minimum output amount in decimals
   * @param expressRelayProgramId - the express relay program id
   * @param inputMintDecimals - the input mint decimals
   * @param outputMintDecimals - the output mint decimals
   * @returns the create take order instruction
   */
  takeOrderIx(
    taker: PublicKey,
    order: OrderStateAndAddress,
    inputAmountLamports: BN,
    minOutputAmountLamports: BN,
    expressRelayProgramId: PublicKey,
    permissionlessTipLamports?: BN,
    permissionless?: boolean,
    wrapUnwrapSol: boolean = true,
  ): TransactionInstruction[] {
    let ixs: TransactionInstruction[] = [];
    let closeWsolAtaIxs: TransactionInstruction[] = [];

    let takerInputAta: PublicKey;
    if (order.state.inputMint.equals(WRAPPED_SOL_MINT)) {
      const {
        createIxs,
        fillIxs: _fill,
        closeIx,
        ata,
      } = this.getInitIfNeededWSOLCreateAndCloseIxs(taker, taker, new BN(0));
      takerInputAta = ata;
      if (wrapUnwrapSol) {
        ixs.push(...createIxs);
        closeWsolAtaIxs.push(...closeIx);
      }
    } else {
      const { ata, createAtaIx: createTakerInputAta } = createAtaIdempotent(
        taker,
        taker,
        order.state.inputMint,
        order.state.inputMintProgramId,
      );
      takerInputAta = ata;
      ixs.push(createTakerInputAta);
    }

    let takerOutputAta: PublicKey;
    if (order.state.outputMint.equals(WRAPPED_SOL_MINT)) {
      const outputExpectedOutForInputAmount = divCeil(
        order.state.expectedOutputAmount.mul(inputAmountLamports),
        order.state.initialInputAmount,
      );

      const { createIxs, fillIxs, closeIx, ata } =
        this.getInitIfNeededWSOLCreateAndCloseIxs(
          taker,
          taker,
          outputExpectedOutForInputAmount,
        );
      takerOutputAta = ata;
      if (wrapUnwrapSol) {
        ixs.push(...createIxs, ...fillIxs);
        closeWsolAtaIxs.push(...closeIx);
      }
    } else {
      const { ata, createAtaIx: createTakerOutputAta } = createAtaIdempotent(
        taker,
        taker,
        order.state.outputMint,
        order.state.outputMintProgramId,
      );
      takerOutputAta = ata;
      ixs.push(createTakerOutputAta);
    }

    let makerOutputAta: PublicKey;
    let intermediaryOutputTokenAccount: PublicKey;

    if (order.state.outputMint.equals(WRAPPED_SOL_MINT)) {
      makerOutputAta = this.getProgramID();
      intermediaryOutputTokenAccount = getIntermediaryTokenAccountPDA(
        this.programId,
        order.address,
      );
    } else {
      // create maker ata
      const { ata, createAtaIx } = createAtaIdempotent(
        order.state.maker,
        taker,
        order.state.outputMint,
        order.state.outputMintProgramId,
      );
      makerOutputAta = ata;
      ixs.push(createAtaIx);
      intermediaryOutputTokenAccount = this.programId;
    }

    ixs.push(
      limoOperations.takeOrder({
        taker,
        maker: order.state.maker,
        globalConfig: order.state.globalConfig,
        inputMint: order.state.inputMint,
        outputMint: order.state.outputMint,
        order: order.address,
        inputAmountLamports,
        minOutputAmountLamports,
        programId: this.programId,
        expressRelayProgramId,
        takerInputAta,
        takerOutputAta,
        intermediaryOutputTokenAccount,
        makerOutputAta,
        inputTokenProgram: order.state.inputMintProgramId,
        outputTokenProgram: order.state.outputMintProgramId,
        permissionlessTipLamports:
          permissionlessTipLamports !== undefined
            ? permissionlessTipLamports
            : new BN(0),
        permissionless: permissionless !== undefined ? permissionless : false,
      }),
    );

    ixs.push(...closeWsolAtaIxs);
    return ixs;
  }

  /**
   * Take an order
   * @param crank - the crank keypair
   * @param order - the order state and address
   * @param inputAmountDecimals - the input amount in decimals
   * @param outputAmountDecimals - the output amount in decimals
   * @param expressRelayProgramId - the express relay program id
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @returns the transaction signature
   */
  async permissionlessTakeOrder(
    crank: Keypair,
    order: OrderStateAndAddress,
    inputAmountLamports: BN,
    outputAmountLamports: BN,
    expressRelayProgramId: PublicKey,
    mode: string,
    permissionlessTipLamports: BN,
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
  ): Promise<TransactionSignature> {
    let inputMintDecimals: number | undefined;
    let outputMintDecimals: number | undefined;
    if (mintDecimals) {
      inputMintDecimals = mintDecimals.get(order.state.inputMint);
      outputMintDecimals = mintDecimals.get(order.state.outputMint);
    }
    inputMintDecimals = inputMintDecimals
      ? inputMintDecimals
      : await getMintDecimals(this._connection, order.state.inputMint);
    outputMintDecimals = outputMintDecimals
      ? outputMintDecimals
      : await getMintDecimals(this._connection, order.state.outputMint);

    const ixs = this.takeOrderIx(
      crank.publicKey,
      order,
      inputAmountLamports,
      outputAmountLamports,
      expressRelayProgramId,
      permissionlessTipLamports,
      true,
    );

    const outputExpectedOutForInputAmount = divCeil(
      order.state.expectedOutputAmount.mul(inputAmountLamports),
      order.state.initialInputAmount,
    );

    const log =
      "Taker Order: " +
      order.address.toString() +
      " selling " +
      lamportsToAmountBN(inputAmountLamports, inputMintDecimals).toString() +
      " token ";
    order.state.inputMint.toString().slice(0, 5) +
      " for " +
      lamportsToAmountBN(
        outputExpectedOutForInputAmount,
        outputMintDecimals,
      ).toString() +
      " token " +
      order.state.outputMint.toString().slice(0, 5);

    const sig = await this.processTxn(crank, ixs, mode, log, []);

    return sig;
  }

  /**
   * Get the create flash take order instruction
   * @param taker - the taker address
   * @param order - the order state and address
   * @param inputAmountDecimal - the input amount in decimals
   * @param minOutputAmountDecimal - the minimum output amount in decimals
   * @param expressRelayProgramId - the express relay program id
   * @param inputMintDecimals - the input mint decimals
   * @param outputMintDecimals - the output mint decimals
   * @param permissionlessTipLamports - the tip in lamports for permissionless flash_take_order
   * @param permissionless - whether the flash take order should be a permissionless call
   * @returns the create flash take order instruction - in between the start and
   * end flash take order instructions, the swap and permissioning logic should exist
   */
  flashTakeOrderIxs(
    taker: PublicKey,
    order: OrderStateAndAddress,
    inputAmountLamports: BN,
    minOutputAmountLamports: BN,
    expressRelayProgramId: PublicKey,
    permissionlessTipLamports?: BN,
    permissionless?: boolean,
    wrapUnwrapSol: boolean = true,
  ): FlashTakeOrderIxs {
    let createAtaIxs: TransactionInstruction[] = [];
    let closeWsolAtaIxs: TransactionInstruction[] = [];

    let takerInputAta: PublicKey;
    if (order.state.inputMint.equals(WRAPPED_SOL_MINT)) {
      const {
        createIxs,
        fillIxs: _fill,
        closeIx,
        ata,
      } = this.getInitIfNeededWSOLCreateAndCloseIxs(taker, taker, new BN(0));
      takerInputAta = ata;
      if (wrapUnwrapSol) {
        createAtaIxs.push(...createIxs);
        closeWsolAtaIxs.push(...closeIx);
      }
    } else {
      const { ata, createAtaIx: createTakerInputAta } = createAtaIdempotent(
        taker,
        taker,
        order.state.inputMint,
        order.state.inputMintProgramId,
      );
      takerInputAta = ata;
      createAtaIxs.push(createTakerInputAta);
    }

    let takerOutputAta: PublicKey;
    if (order.state.outputMint.equals(WRAPPED_SOL_MINT)) {
      const outputExpectedOutForInputAmount = divCeil(
        order.state.expectedOutputAmount.mul(inputAmountLamports),
        order.state.initialInputAmount,
      );

      const {
        createIxs,
        fillIxs: _fillIxs,
        closeIx,
        ata,
      } = this.getInitIfNeededWSOLCreateAndCloseIxs(
        taker,
        taker,
        outputExpectedOutForInputAmount,
      );
      takerOutputAta = ata;
      if (wrapUnwrapSol) {
        createAtaIxs.push(...createIxs);
        closeWsolAtaIxs.push(...closeIx);
      }
    } else {
      const { ata, createAtaIx: createTakerOutputAta } = createAtaIdempotent(
        taker,
        taker,
        order.state.outputMint,
        order.state.outputMintProgramId,
      );
      takerOutputAta = ata;
      createAtaIxs.push(createTakerOutputAta);
    }

    let makerOutputAta: PublicKey;
    let intermediaryOutputTokenAccount: PublicKey;

    if (order.state.outputMint.equals(WRAPPED_SOL_MINT)) {
      makerOutputAta = this.getProgramID();
      intermediaryOutputTokenAccount = getIntermediaryTokenAccountPDA(
        this.programId,
        order.address,
      );
    } else {
      // create maker ata
      const { ata, createAtaIx } = createAtaIdempotent(
        order.state.maker,
        taker,
        order.state.outputMint,
        order.state.outputMintProgramId,
      );
      makerOutputAta = ata;
      createAtaIxs.push(createAtaIx);
      intermediaryOutputTokenAccount = this.programId;
    }

    const { startIx: startFlashIx, endIx: endFlashIx } =
      limoOperations.flashTakeOrder({
        taker,
        maker: order.state.maker,
        globalConfig: order.state.globalConfig,
        inputMint: order.state.inputMint,
        outputMint: order.state.outputMint,
        order: order.address,
        inputAmountLamports,
        minOutputAmountLamports,
        programId: this.programId,
        expressRelayProgramId,
        takerInputAta,
        takerOutputAta,
        intermediaryOutputTokenAccount,
        makerOutputAta,
        inputTokenProgram: order.state.inputMintProgramId,
        outputTokenProgram: order.state.outputMintProgramId,
        permissionlessTipLamports:
          permissionlessTipLamports !== undefined
            ? permissionlessTipLamports
            : new BN(0),
        permissionless: permissionless !== undefined ? permissionless : false,
      });

    return {
      createAtaIxs,
      startFlashIx,
      endFlashIx,
      closeWsolAtaIxs: closeWsolAtaIxs,
    };
  }

  /**
   * Flash take an order
   * @param crank - the crank keypair
   * @param order - the order state and address
   * @param inputAmountDecimals - the input amount in decimals
   * @param outputAmountDecimals - the output amount in decimals
   * @param expressRelayProgramId - the express relay program id
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @returns the transaction signature
   */
  async permissionlessFlashTakeOrder(
    crank: Keypair,
    order: OrderStateAndAddress,
    inputAmountLamports: BN,
    outputAmountLamports: BN,
    expressRelayProgramId: PublicKey,
    mode: string,
    swapIxs: TransactionInstruction[],
    permissionlessTipLamports: BN,
    extraSigners: Keypair[],
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
  ): Promise<TransactionSignature> {
    let inputMintDecimals: number | undefined;
    let outputMintDecimals: number | undefined;
    if (mintDecimals) {
      inputMintDecimals = mintDecimals.get(order.state.inputMint);
      outputMintDecimals = mintDecimals.get(order.state.outputMint);
    }
    inputMintDecimals = inputMintDecimals
      ? inputMintDecimals
      : await getMintDecimals(this._connection, order.state.inputMint);
    outputMintDecimals = outputMintDecimals
      ? outputMintDecimals
      : await getMintDecimals(this._connection, order.state.outputMint);

    const { createAtaIxs, startFlashIx, endFlashIx, closeWsolAtaIxs } =
      this.flashTakeOrderIxs(
        crank.publicKey,
        order,
        inputAmountLamports,
        outputAmountLamports,
        expressRelayProgramId,
        permissionlessTipLamports,
        true,
      );

    const outputExpectedOutForInputAmount = divCeil(
      order.state.expectedOutputAmount.mul(inputAmountLamports),
      order.state.initialInputAmount,
    );

    const log =
      "Taker Order: " +
      order.address.toString() +
      " selling " +
      lamportsToAmountBN(inputAmountLamports, inputMintDecimals).toString() +
      " token ";
    order.state.inputMint.toString().slice(0, 5) +
      " for " +
      lamportsToAmountBN(
        outputExpectedOutForInputAmount,
        outputMintDecimals,
      ).toString() +
      " token " +
      order.state.outputMint.toString().slice(0, 5);

    const sig = await this.processTxn(
      crank,
      [
        ...createAtaIxs,
        startFlashIx,
        ...swapIxs,
        endFlashIx,
        ...closeWsolAtaIxs,
      ],
      mode,
      log,
      extraSigners,
      300_000,
    );

    return sig;
  }

  /**
   * Get the create close order instruction
   * @param user - the user address
   * @param inputMont - the inputMint for the swap
   * @param outputMint - the outputMint for the swap
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @returns the log ixs - to be used once at the beginning and once at the end
   */
  logUserSwapBalancesIxs(
    user: PublicKey,
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    swapProgarmId: PublicKey = this.programId,
    pdaReferrer: PublicKey = this.programId,
  ): {
    beforeSwapIx: TransactionInstruction;
    afterSwapIx: TransactionInstruction;
  } {
    const inputMintAta = getAssociatedTokenAddressSync(
      inputMint,
      user,
      true,
      inputMintProgramId,
    );
    const outputMintAta = getAssociatedTokenAddressSync(
      outputMint,
      user,
      true,
      outputMintProgramId,
    );

    const logIxStart = logUserSwapBalancesStart(
      {
        swapProgramId: swapProgarmId,
      },
      {
        baseAccounts: {
          maker: user,
          inputMint,
          outputMint,
          inputTa: inputMintAta,
          outputTa: outputMintAta,
          pdaReferrer,
        },
        userSwapBalanceState: getUserSwapBalanceStatePDA(user, this.programId),
        eventAuthority: getEventAuthorityPDA(this.programId),
        program: this.programId,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
    );

    const logIxEnd = logUserSwapBalancesEnd(
      {
        swapProgramId: swapProgarmId,
      },
      {
        baseAccounts: {
          maker: user,
          inputMint,
          outputMint,
          inputTa: inputMintAta,
          outputTa: outputMintAta,
          pdaReferrer,
        },
        userSwapBalanceState: getUserSwapBalanceStatePDA(user, this.programId),
        eventAuthority: getEventAuthorityPDA(this.programId),
        program: this.programId,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
    );

    return {
      beforeSwapIx: logIxStart,
      afterSwapIx: logIxEnd,
    };
  }

  /**
   * Get the create close order instruction
   * @param user - the user address
   * @param inputMont - the inputMint for the swap
   * @param outputMint - the outputMint for the swap
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @returns the log ixs - to be used once at the beginning and once at the end
   */
  async logUserSwapBalances(
    user: Keypair,
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    setupIxs: TransactionInstruction[] = [],
    mockSwapIxs: TransactionInstruction[] = [],
    mockSwapSigners: Keypair[] = [],
  ): Promise<TransactionSignature> {
    const { beforeSwapIx, afterSwapIx } = this.logUserSwapBalancesIxs(
      user.publicKey,
      inputMint,
      outputMint,
      inputMintProgramId,
      outputMintProgramId,
    );

    const sig = await this.processTxn(
      user,
      [...setupIxs, beforeSwapIx, ...mockSwapIxs, afterSwapIx],
      "execute",
      "",
      mockSwapSigners,
      300_000,
    );

    console.log("logUserSwapBalances", sig);

    return sig;
  }

  /**
   * Get the total tips for all filled orders from the given orders array
   * @param orders - the list of orders to filter by filled and calculate the total tips
   * @returns the decimal amount of native sol tips
   */
  getTotalTipsForFilledOrdersDecimal(orders: OrderDisplay[]): Decimal {
    let totalTipsForFilledOrdersLamports = new Decimal(0);
    for (const order of orders) {
      if (order.state.status === 1) {
        // Filled
        totalTipsForFilledOrdersLamports = totalTipsForFilledOrdersLamports.add(
          order.orderTipDecimal,
        );
      }
    }
    return totalTipsForFilledOrdersLamports;
  }

  /**
   * Get the all instructions to close and claim tips for all filled orders from the given orders array
   * @param maker - the maker address to close and claim tips for
   * @param orders - the list of orders to filter by filled and calculate the total tips
   * @returns an array of arrays of instructions to close and claim tips for all filled orders -
   * this should be used as multiple transactions
   */
  getCloseAndClaimTipsForFilledOrdersTxsIxs(
    maker: PublicKey,
    orders: OrderDisplay[],
    batchSize: number = MAX_CLOSE_ORDER_AND_CLAIM_TIP_ORDERS_IN_TX,
  ): TransactionInstruction[][] {
    let ixsArrays: TransactionInstruction[][] = [];
    ixsArrays.push([]);

    for (const order of orders) {
      if (order.state.status === 1) {
        // Filled
        const orderStateAndAddress: OrderStateAndAddress = {
          state: order.state,
          address: order.address,
        };

        const ixs = this.closeOrderAndClaimTipIx(maker, orderStateAndAddress);

        // Once the batchSize of previous array is hit, create a new array
        if (ixsArrays[ixsArrays.length - 1].length + ixs.length > batchSize) {
          ixsArrays.push([]);
        }

        ixsArrays[ixsArrays.length - 1].push(...ixs);
      }
    }

    return ixsArrays;
  }

  /**
   * Get the create close order and claim tip instruction
   * @param maker - the maker address
   * @param order - the order state and address
   * @returns the create close order and claim tip instruction
   */
  closeOrderAndClaimTipIx(
    maker: PublicKey,
    order: OrderStateAndAddress,
    wrapUnwrapSol: boolean = true,
  ): TransactionInstruction[] {
    let ixs: TransactionInstruction[] = [];
    let closeWsolAtaIxs: TransactionInstruction[] = [];
    let makerInputAta: PublicKey;
    if (order.state.inputMint.equals(WRAPPED_SOL_MINT)) {
      const {
        createIxs,
        fillIxs: _fill,
        closeIx,
        ata,
      } = this.getInitIfNeededWSOLCreateAndCloseIxs(maker, maker, new BN(0));
      makerInputAta = ata;
      if (wrapUnwrapSol) {
        ixs.push(...createIxs);
        closeWsolAtaIxs.push(...closeIx);
      }
    } else {
      const { ata, createAtaIx: createMakerInputAta } = createAtaIdempotent(
        maker,
        maker,
        order.state.inputMint,
        order.state.inputMintProgramId,
      );
      makerInputAta = ata;
      ixs.push(createMakerInputAta);
    }

    ixs.push(
      limoOperations.closeOrderAndClaimTip({
        maker: maker,
        globalConfig: order.state.globalConfig,
        inputMint: order.state.inputMint,
        outputMint: order.state.outputMint,
        order: order.address,
        programId: this.programId,
        makerInputAta,
        inputTokenProgram: order.state.inputMintProgramId,
      }),
    );

    ixs.push(...closeWsolAtaIxs);

    return ixs;
  }

  /**
   * Close an order and claim tip
   * @param maker - the maker keypair
   * @param order - the order state and address
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param mintDecimals - map of mint addresses and their number of decimals
   * @returns the transaction signature
   */
  async closeOrderAndClaimTip(
    maker: Keypair,
    order: OrderStateAndAddress,
    mode: string,
    mintDecimals?: PubkeyHashMap<PublicKey, number>,
  ): Promise<TransactionSignature> {
    let ixs = this.closeOrderAndClaimTipIx(maker.publicKey, order);

    let inputMintDecimals: number | undefined;
    let tipMintDecimals: number | undefined;
    if (mintDecimals) {
      inputMintDecimals = mintDecimals.get(order.state.inputMint);
      tipMintDecimals = mintDecimals.get(NATIVE_MINT);
    }
    inputMintDecimals = inputMintDecimals
      ? inputMintDecimals
      : await getMintDecimals(this._connection, order.state.inputMint);
    tipMintDecimals = tipMintDecimals
      ? tipMintDecimals
      : await getMintDecimals(this._connection, NATIVE_MINT);

    const log =
      "Close Order: " +
      order.address.toString() +
      " claiming " +
      lamportsToAmountBN(
        order.state.remainingInputAmount,
        inputMintDecimals,
      ).toString() +
      " input token ";
    order.state.inputMint.toString().slice(0, 5) +
      " and " +
      lamportsToAmountBN(order.state.tipAmount, tipMintDecimals).toString();
    (" tip ");

    const sig = await this.processTxn(maker, ixs, mode, log, []);

    return sig;
  }

  /**
   * Get the update order instructions - close current order and initialize new order
   * @param order - the order state to close
   * @param user - the user address
   * @param inputMint - the input mint address
   * @param outputMint - the output mint address
   * @param inputAmountLamports - the input amount in lamports
   * @param outputAmountLamports - the output amount in lamports
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @param globalConfigOverride - the global config override
   * @returns the create initialize order instruction and keypair to sign the transaction with
   * @throws error if mint decimals not found for mint
   */
  async updateOrderGenericIx(
    order: OrderStateAndAddress,
    user: PublicKey,
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmountLamports: BN,
    outputAmountLamports: BN,
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    globalConfigOverride?: PublicKey,
    wrapUnwrapSol: boolean = true,
  ): Promise<[TransactionInstruction[], Keypair]> {
    let closeOrderIx = this.closeOrderAndClaimTipIx(user, order, wrapUnwrapSol);

    let [createOrderIx, orderKeypair] = await this.createOrderGenericIx(
      user,
      inputMint,
      outputMint,
      inputAmountLamports,
      outputAmountLamports,
      inputMintProgramId,
      outputMintProgramId,
      globalConfigOverride,
    );

    return [[...closeOrderIx, ...createOrderIx], orderKeypair];
  }

  /**
   * Get the update order instructions - close current order and initialize new order
   * @param order - the order state to close
   * @param user - the user keypair
   * @param inputMint - the input mint address
   * @param outputMint - the output mint address
   * @param inputAmountLamports - the input amount in lamports
   * @param outputAmountLamports - the output amount in lamports
   * @param inputMintProgramId - the input mint program id
   * @param outputMintProgramId - the output mint program id
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param globalConfigOverride - the global config override
   * @returns the create initialize order instruction and keypair to sign the transaction with
   * @throws error if mint decimals not found for mint
   */
  async updateOrderGeneric(
    order: OrderStateAndAddress,
    user: Keypair,
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmountLamports: BN,
    outputAmountLamports: BN,
    inputMintProgramId: PublicKey,
    outputMintProgramId: PublicKey,
    mode: string = "execute",
    globalConfigOverride?: PublicKey,
    wrapUnwrapSol: boolean = true,
  ): Promise<[string, Keypair]> {
    const [ixs, orderKp] = await this.updateOrderGenericIx(
      order,
      user.publicKey,
      inputMint,
      outputMint,
      inputAmountLamports,
      outputAmountLamports,
      inputMintProgramId,
      outputMintProgramId,
      globalConfigOverride,
      wrapUnwrapSol,
    );

    const log =
      "Update order: " +
      "closing order: " +
      order.toString() +
      " and creating order " +
      orderKp.publicKey.toString();

    const sig = await this.processTxn(user, ixs, mode, log, [orderKp]);

    return [sig, orderKp];
  }

  /**
   * Get the update global config instruction
   * @param admin - the admin address
   * @param mode - the mode to update
   * @param value - the value
   * @param globalConfigOverride - the global config override
   * @returns the update global config instruction
   */
  updateGlobalConfigIx(
    mode: string,
    value: number | PublicKey,
    globalConfigOverride?: PublicKey,
  ): TransactionInstruction[] {
    const ixs: TransactionInstruction[] = [];

    const gc = this.getGlobalConfigStateSync();

    ixs.push(
      limoOperations.updateGlobalConfigIx(
        gc.adminAuthority,
        globalConfigOverride ? globalConfigOverride : this._globalConfig,
        UpdateGlobalConfigMode.fromDecoded({ [mode]: "" }),
        value,
        this.programId,
      ),
    );

    return ixs;
  }

  /**
   * Update the global config
   * @param admin - the admin keypair
   * @param updateMode - the update mode
   * @param value - the value
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param globalConfigOverride - the global config override
   * @returns the transaction signature
   */
  async updateGlobalConfig(
    admin: Keypair,
    updateMode: string,
    value: number | PublicKey,
    mode: string,
    globalConfigOverride?: PublicKey,
  ): Promise<TransactionSignature> {
    await this.getGlobalConfigState();
    const ixs = this.updateGlobalConfigIx(
      updateMode,
      value,
      globalConfigOverride,
    );

    const log =
      "Update global config: " +
      this._globalConfig.toString() +
      " with mode " +
      updateMode +
      " and value " +
      value.toString();

    console.log("updateGlobalConfig", log);

    const sig = await this.processTxn(admin, ixs, mode, log, []);

    return sig;
  }

  /**
   * Get the update global config admin instruction - should be signed by the current globalConfig.adminAuthorityCached
   * @param globalConfigOverride - the global config override
   * @returns the update global config admin instruction
   */
  async updateGlobalConfigAdminIx(
    globalConfigOverride?: PublicKey,
  ): Promise<TransactionInstruction> {
    const globalConfigState = globalConfigOverride
      ? await GlobalConfig.fetch(this._connection, globalConfigOverride)
      : await this.getGlobalConfigState();

    if (!globalConfigState) {
      throw new Error("Global config not found");
    }

    const ix = limoOperations.updateGlobalConfigAdminIx(
      this._globalConfig,
      globalConfigState,
      this.programId,
    );

    return ix;
  }

  /**
   * Update the global config admin
   * @param admin - the admin keypair, should match the current globalConfig.adminAuthorityCached
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param globalConfigOverride - the global config override
   * @returns the transaction signature
   */
  async updateGlobalConfigAdmin(
    admin: Keypair,
    mode: string,
    globalConfigOverride?: PublicKey,
  ): Promise<TransactionSignature> {
    const ix = await this.updateGlobalConfigAdminIx(globalConfigOverride);

    const log =
      "Update global config admin: " +
      this._globalConfig.toString() +
      " with admin " +
      admin.publicKey.toBase58();

    const sig = await this.processTxn(admin, [ix], mode, log, []);

    return sig;
  }

  /**
   * Get the withdraw host tip instruction
   * @param admin - the admin address
   * @param globalConfigOverride - the global config override
   * @returns the withdraw host tip instruction
   */
  withdrawHostTipIx(
    admin: PublicKey,
    globalConfigOverride?: PublicKey,
  ): TransactionInstruction[] {
    let ixs: TransactionInstruction[] = [];

    ixs.push(
      withdrawHostTipIx({
        admin,
        globalConfig: globalConfigOverride
          ? globalConfigOverride
          : this._globalConfig,
        programId: this.programId,
      }),
    );

    return ixs;
  }

  /**
   * Withdraw the host tip
   * @param admin - the admin keypair
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param globalConfigOverride - the global config override
   * @returns the transaction signature
   */
  async withdrawHostTip(
    admin: Keypair,
    mode: string,
    globalConfigOverride?: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const ixs = this.withdrawHostTipIx(admin.publicKey, globalConfigOverride);

    const log =
      "Withdraw host tip: " +
      this._globalConfig.toString() +
      " with admin " +
      admin.publicKey.toBase58();

    const sig = await this.processTxn(admin, ixs, mode, log, []);

    return ixs;
  }

  /**
   * Get the number of decimals for the order input mint
   * @param order - the order state and address
   * @returns the number of decimals
   */
  async getOrderInputMintDecimals(
    order: OrderStateAndAddress,
  ): Promise<number> {
    return await getMintDecimals(this._connection, order.state.inputMint);
  }

  /**
   * Get the number of decimals for the order output mint
   * @param order - the order state and address
   * @returns the number of decimals
   */
  async getOrderOutputMintDecimals(
    order: OrderStateAndAddress,
  ): Promise<number> {
    return await getMintDecimals(this._connection, order.state.outputMint);
  }

  /**
   * Get the number of decimals for given mints array
   * @param mints - an array of mints
   * @returns a PubkeyHashMap of the mints and number of decimals
   */
  async getMintDecimals(
    mints: PublicKey[],
  ): Promise<PubkeyHashMap<PublicKey, number>> {
    const mintDecimals = new PubkeyHashMap<PublicKey, number>();
    for (const mint of mints) {
      mintDecimals.set(mint, await getMintDecimals(this._connection, mint));
    }
    return mintDecimals;
  }

  /**
   * Get the number of decimals for all mints in all of the order states
   * @returns a PubkeyHashMap of the mints and number of decimals
   */
  async getAllMintDecimals(): Promise<PubkeyHashMap<PublicKey, number>> {
    const allOrders = await this.getAllOrdersStateAndAddressWithFilters(
      [],
      undefined,
      false,
    );
    const mints: PublicKey[] = [];
    for (const order of allOrders) {
      mints.push(order.state.inputMint);
      mints.push(order.state.outputMint);
    }

    return await this.getMintDecimals(mints);
  }

  async getMintsProgramOwners(mints: PublicKey[]): Promise<PublicKey[]> {
    const mintAccounts = await this._connection.getMultipleAccountsInfo(mints);

    const mintProgramIds = mintAccounts.map((mintAccount) => {
      if (!mintAccount) {
        throw new Error("Mint not found");
      }
      return mintAccount.owner;
    });

    return mintProgramIds;
  }

  /**
   * Execute a transaction
   * @param ix - the transaction instructions
   * @param signer - the signer keypair
   * @param extraSigners - the extra signers
   * @returns the transaction signature
   */
  async executeTransaction(
    ix: TransactionInstruction[],
    signer: Keypair,
    extraSigners: Signer[] = [],
  ): Promise<TransactionSignature> {
    const tx = new Transaction();
    const { blockhash } = await this._connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = signer.publicKey;
    tx.add(...ix);

    const sig: TransactionSignature = await sendAndConfirmTransaction(
      this._connection,
      tx,
      [signer, ...extraSigners],
      { commitment: "confirmed" },
    );

    return sig;
  }

  /**
   * Process a transaction based on the execution mode
   * @param admin - the admin keypair
   * @param ixs - the transaction instructions
   * @param mode - the execution mode (simulate/execute/multisig)
   * @param debugMessage - the debug message
   * @param extraSigners - the extra signers
   * @param computeUnits - the number of compute units
   * @param priorityFeeLamports - the priority fee in lamports
   * @returns the transaction signature
   */
  async processTxn(
    admin: Keypair,
    ixs: TransactionInstruction[],
    mode: string,
    debugMessage?: string,
    extraSigners?: Signer[],
    computeUnits: number = 200_000,
    priorityFeeLamports: number = 10000,
  ): Promise<TransactionSignature> {
    if (mode === "multisig" || mode === "simulate") {
      console.log("asdsa");
      const { blockhash } = await this._connection.getLatestBlockhash();
      const txn = new Transaction();
      txn.add(...ixs);
      txn.recentBlockhash = blockhash;
      txn.feePayer = admin.publicKey;

      // if simulate is true, always simulate
      if (mode === "simulate") {
        await printSimulateTx(this._connection, txn);
      } else {
        // if simulate is false (multisig is true)
        await printMultisigTx(txn);
      }

      return "";
    } else if (mode === "execute") {
      const microLamport = priorityFeeLamports * 10 ** 6; // 1000 lamports
      const microLamportsPrioritizationFee = microLamport / computeUnits;
      const priorityFeeIxs = createAddExtraComputeUnitFeeTransaction(
        computeUnits,
        microLamportsPrioritizationFee,
      );

      const sig = await this.executeTransaction(
        [...priorityFeeIxs, ...ixs],
        admin,
        extraSigners,
      );

      if (process.env.DEBUG === "true" && debugMessage) {
        console.log(debugMessage);
        console.log("txn: " + sig.toString());
      }

      return sig;
    }

    console.log(debugMessage);

    return "";
  }

  /**
   * Get the wsol create fill and close ixs for a given owner and payer
   * @param owner - the owner address
   * @param payer - the payer address
   * @param amountToDepositLamports - the amount to deposit in lamports
   * @returns the create, fill, and close instructions, toghether with the ata
   */
  getInitIfNeededWSOLCreateAndCloseIxs(
    owner: PublicKey,
    payer: PublicKey,
    amountToDepositLamports?: BN,
  ): {
    createIxs: TransactionInstruction[];
    fillIxs: TransactionInstruction[];
    closeIx: TransactionInstruction[];
    ata: PublicKey;
  } {
    const createIxs: TransactionInstruction[] = [];
    const { ata, createAtaIx } = createAtaIdempotent(
      owner,
      payer,
      WRAPPED_SOL_MINT,
      TOKEN_PROGRAM_ID,
    );
    createIxs.push(createAtaIx);
    const fillIxs: TransactionInstruction[] = [];
    if (amountToDepositLamports && payer.equals(owner)) {
      fillIxs.push(
        ...this.getDepositWsolIxns(owner, ata, amountToDepositLamports),
      );
    }
    const closeWsolAtaIxn: TransactionInstruction[] = [];
    if (payer.equals(owner)) {
      closeWsolAtaIxn.push(
        createCloseAccountInstruction(ata, owner, owner, [], TOKEN_PROGRAM_ID),
      );
    }

    return {
      createIxs: createIxs,
      fillIxs: fillIxs,
      closeIx: closeWsolAtaIxn,
      ata,
    };
  }

  /**
   * Get the deposit WSOL instructions
   * @param owner - the owner address
   * @param ata - the ata address
   * @param amountLamports - the amount in lamports
   * @returns the transaction instructions
   */
  getDepositWsolIxns(
    owner: PublicKey,
    ata: PublicKey,
    amountLamports: BN,
  ): TransactionInstruction[] {
    const ixns: TransactionInstruction[] = [];

    // Transfer to WSOL ata
    ixns.push(
      SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: ata,
        lamports: BigInt(amountLamports.toString()),
      }),
    );

    // Sync wrapped SOL
    ixns.push(
      new TransactionInstruction({
        keys: [
          {
            pubkey: ata,
            isSigner: false,
            isWritable: true,
          },
        ],
        data: Buffer.from(new Uint8Array([17])),
        programId: TOKEN_PROGRAM_ID,
      }),
    );

    return ixns;
  }
}
