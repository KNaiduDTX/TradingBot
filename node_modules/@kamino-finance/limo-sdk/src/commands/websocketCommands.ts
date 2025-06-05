import { PublicKey } from "@solana/web3.js";
import { Order } from "../rpc_client/accounts";
import { initializeClient } from "./utils";
import {
  getLimoProgramId,
  FilledOrderQueue,
  OrderStateAndAddress,
  PubkeyHashMap,
  sleep,
  OrderDisplay,
} from "../utils";
import { LimoClient } from "../Limo";

export async function listenToOrderChanges() {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;

  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  const ordersUpdated = new PubkeyHashMap<PublicKey, Order>();

  const callbackOnChange = async (
    orderStateAndAddress: OrderStateAndAddress,
    slot: number,
  ) => {
    console.log("Order updated", orderStateAndAddress, slot);
    ordersUpdated.set(orderStateAndAddress.address, orderStateAndAddress.state);
  };

  const subscriptionId = client.listenToOrdersChangeWithFilters(
    [],
    callbackOnChange,
  );

  while (ordersUpdated.size < 10) {
    await sleep(2000);
    console.log("Orders updated size", ordersUpdated.size);
  }

  client.stopListeningToOrdersChange(subscriptionId);
}

export async function listenToOrderFillChangesForQuoteAndBase(
  quote: PublicKey,
  base: PublicKey,
) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;

  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  // const latestFilledOrders = new PubkeyHashMap<PublicKey, Order>();
  const mintDecimals = await client.getMintDecimals([quote, base]);

  const { filledOrdersBuy, filledOrdersSell } =
    await client.getLatestFilledOrders(base, quote, mintDecimals);

  const latestTenFilledBuyOrders = new FilledOrderQueue(10, filledOrdersBuy);
  const latestTenFilledSellOrders = new FilledOrderQueue(10, filledOrdersSell);
  let ordersUpdated = 0;

  const callbackOnChangeBuyOrder = async (
    orderStateAndAddress: OrderStateAndAddress,
    slot: number,
  ) => {
    console.log("Buy Order updated", orderStateAndAddress, slot);
    const order = client.toOrdersDisplay(
      [orderStateAndAddress],
      mintDecimals,
    )[0];
    ordersUpdated += 1;
    latestTenFilledBuyOrders.push({
      address: order.address,
      orderDisplay: order,
      quoteTokenMint: quote,
      baseTokenMint: base,
      time: order.state.lastUpdatedTimestamp.toNumber(),
      price: order.executionPriceInputToOutput,
      size: order.filledOutputAmountDecimal,
      txid: "N/A",
      type: "buy",
    });
  };

  const callbackOnChangeSellOrder = async (
    orderStateAndAddress: OrderStateAndAddress,
    slot: number,
  ) => {
    console.log("Sell Order updated", orderStateAndAddress, slot);
    const order = client.toOrdersDisplay(
      [orderStateAndAddress],
      mintDecimals,
    )[0];
    ordersUpdated += 1;
    latestTenFilledSellOrders.push({
      address: orderStateAndAddress.address,
      orderDisplay: order,
      quoteTokenMint: quote,
      baseTokenMint: base,
      time: orderStateAndAddress.state.lastUpdatedTimestamp.toNumber(),
      price: order.executionPriceOutputToInput,
      size: order.filledOutputAmountDecimal,
      txid: "N/A",
      type: "sell",
    });
  };

  const { subscriptionIdBuyOrders, subscriptionIdSellOrders } =
    client.listenToOrderFillChangeForBaseAndQuote(
      base,
      quote,
      callbackOnChangeSellOrder,
      callbackOnChangeBuyOrder,
    );

  while (ordersUpdated < 10) {
    await sleep(10000);
    console.log("Number of orders updated", ordersUpdated);
  }

  client.stopListeningToOrdersChange(subscriptionIdBuyOrders);
  client.stopListeningToOrdersChange(subscriptionIdSellOrders);
}

export async function listenToOrderChangesForQuoteAndBase(
  quote: PublicKey,
  base: PublicKey,
) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;

  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  const mintDecimals = await client.getMintDecimals([quote, base]);

  const { bidOrders: ordersBuy, askOrders: ordersSell } =
    await client.getOrdersDisplayForBaseAndQuote(base, quote, mintDecimals);

  const buyOrders = new PubkeyHashMap<PublicKey, OrderDisplay>();
  const sellOrders = new PubkeyHashMap<PublicKey, OrderDisplay>();
  ordersBuy.forEach((order) => {
    buyOrders.set(order.address, order);
  });
  ordersSell.forEach((order) => {
    sellOrders.set(order.address, order);
  });
  let ordersUpdated = 0;

  const callbackOnChangeBuyOrder = async (
    orderStateAndAddress: OrderStateAndAddress,
    slot: number,
  ) => {
    console.log("Buy Order updated", orderStateAndAddress, slot);
    const order = client.toOrdersDisplay(
      [orderStateAndAddress],
      mintDecimals,
    )[0];
    ordersUpdated += 1;
    ordersBuy.push(order);
  };

  const callbackOnChangeSellOrder = async (
    orderStateAndAddress: OrderStateAndAddress,
    slot: number,
  ) => {
    console.log("Sell Order updated", orderStateAndAddress, slot);
    const order = client.toOrdersDisplay(
      [orderStateAndAddress],
      mintDecimals,
    )[0];
    ordersUpdated += 1;
    ordersSell.push(order);
  };

  const { subscriptionIdBuyOrders, subscriptionIdSellOrders } =
    client.listenToOrderChangeForBaseAndQuote(
      base,
      quote,
      callbackOnChangeSellOrder,
      callbackOnChangeBuyOrder,
    );

  while (ordersUpdated < 10) {
    await sleep(10000);
    console.log("Number of orders updated", ordersUpdated);
  }

  client.stopListeningToOrdersChange(subscriptionIdBuyOrders);
  client.stopListeningToOrdersChange(subscriptionIdSellOrders);
}

export async function listenToOrderChangesForMaker(maker: PublicKey) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;

  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  const mintDecimals = await client.getAllMintDecimals();
  let ordersUpdated = 0;

  const existingOrders = await client.getAllOrdersDisplayForMaker(
    maker,
    mintDecimals,
  );
  const makerOrders = new PubkeyHashMap<PublicKey, OrderDisplay>();
  existingOrders.forEach((order) => {
    makerOrders.set(order.address, order);
  });

  const callbackOnChange = async (
    orderStateAndAddress: OrderStateAndAddress,
    slot: number,
  ) => {
    console.log("Order updated", orderStateAndAddress, slot);
    ordersUpdated += 1;
    const orderDisplay = client.toOrdersDisplay(
      [orderStateAndAddress],
      mintDecimals,
    )[0];
    makerOrders.set(orderStateAndAddress.address, orderDisplay);
  };

  const subscriptionId = client.listenToMakerOrders(maker, callbackOnChange);

  while (ordersUpdated < 10) {
    await sleep(2000);
    console.log("Number of Orders updated", ordersUpdated);
  }

  client.stopListeningToOrdersChange(subscriptionId);
}
