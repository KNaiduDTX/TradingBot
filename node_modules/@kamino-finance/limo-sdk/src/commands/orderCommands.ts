import { GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import { Order, OrderFields } from "../rpc_client/accounts";
import { green, initializeClient, red } from "./utils";
import {
  amountToLamportsBN,
  getLimoProgramId,
  getMintDecimals,
  lamportsToAmountDecimal,
} from "../utils";
import { LimoClient } from "../Limo";
import Decimal from "decimal.js";
import BN from "bn.js";

export async function listOrders(
  quoteToken: string | undefined,
  baseToken: string | undefined,
  filterOutRemainingLamportsAmountBaseToken: string | undefined,
  filterOutRemainingLamportsAmountQuoteToken: string | undefined,
) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;

  const filterOutBaseDecimalAmount = filterOutRemainingLamportsAmountBaseToken
    ? new Decimal(filterOutRemainingLamportsAmountBaseToken)
    : new Decimal(0);
  const filterOutQuoteDecimalAmount = filterOutRemainingLamportsAmountQuoteToken
    ? new Decimal(filterOutRemainingLamportsAmountQuoteToken)
    : new Decimal(0);

  let quote = new PublicKey((quoteToken ?? process.env.QUOTE_TOKEN)!);
  let base = new PublicKey((baseToken ?? process.env.BASE_TOKEN)!);

  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  let bidOrders = await getOrders(client, base, quote);
  let askOrders = await getOrders(client, quote, base);

  let mints = new Set<string>();
  for (let [order, _] of [...bidOrders, ...askOrders]) {
    mints.add(order.inputMint.toString());
    mints.add(order.outputMint.toString());
  }
  let decimalsMap: Map<string, number> = new Map();

  for (let mint of mints) {
    let decimals = await getMintDecimals(
      env.provider.connection,
      new PublicKey(mint),
    );
    decimalsMap.set(mint, decimals);
  }

  let bidOrdersFormatted: {
    price: Decimal;
    quoteUiAmount: Decimal;
    baseUiAmount: Decimal;
    quoteDisplay: string;
    baseDisplay: string;
    orderAddress: PublicKey;
  }[] = [];

  let askOrdersFormatted: {
    price: Decimal;
    quoteUiAmount: Decimal;
    baseUiAmount: Decimal;
    quoteDisplay: string;
    baseDisplay: string;
    orderAddress: PublicKey;
  }[] = [];

  for (let [order, orderAddress] of askOrders) {
    // TODO: remove this, temporary until smart contracts fixed
    if (order.initialInputAmount.toNumber() === 0) {
      continue;
    }

    let quoteAmount = new Decimal(order.initialInputAmount.toNumber());
    let baseAmount = new Decimal(order.expectedOutputAmount.toNumber());

    let quoteToken = order.inputMint.toString();
    let baseToken = order.outputMint.toString();

    let quoteDecimals = decimalsMap.get(quoteToken)!;
    let baseDecimals = decimalsMap.get(baseToken)!;

    let quoteUiAmount = lamportsToAmountDecimal(quoteAmount, quoteDecimals);
    let baseUiAmount = lamportsToAmountDecimal(baseAmount, baseDecimals);

    if (baseUiAmount.lt(filterOutBaseDecimalAmount)) {
      continue;
    }

    if (quoteUiAmount.lt(filterOutQuoteDecimalAmount)) {
      continue;
    }

    let price = baseUiAmount.div(quoteUiAmount);
    let quoteDisplay = quoteToken.slice(0, 4);
    let baseDisplay = baseToken.slice(0, 4);

    askOrdersFormatted.push({
      price,
      quoteUiAmount,
      baseUiAmount,
      quoteDisplay,
      baseDisplay,
      orderAddress,
    });
  }

  for (let [order, orderAddress] of bidOrders) {
    // TODO: remove this, temporary until smart contracts fixed
    if (order.expectedOutputAmount.toNumber() === 0) {
      continue;
    }
    let quoteAmount = new Decimal(order.expectedOutputAmount.toNumber());
    let baseAmount = new Decimal(order.initialInputAmount.toNumber());

    let quoteToken = order.outputMint.toString();
    let baseToken = order.inputMint.toString();

    let quoteDecimals = decimalsMap.get(quoteToken)!;
    let baseDecimals = decimalsMap.get(baseToken)!;

    let quoteUiAmount = lamportsToAmountDecimal(quoteAmount, quoteDecimals);
    let baseUiAmount = lamportsToAmountDecimal(baseAmount, baseDecimals);

    if (baseUiAmount.lt(filterOutBaseDecimalAmount)) {
      continue;
    }

    if (quoteUiAmount.lt(filterOutQuoteDecimalAmount)) {
      continue;
    }

    let price = baseUiAmount.div(quoteUiAmount);
    let quoteDisplay = quoteToken.slice(0, 4);
    let baseDisplay = baseToken.slice(0, 4);

    bidOrdersFormatted.push({
      price,
      quoteUiAmount,
      baseUiAmount,
      quoteDisplay,
      baseDisplay,
      orderAddress,
    });
  }

  bidOrdersFormatted.sort((a, b) => {
    return b.price.comparedTo(a.price);
  });

  askOrdersFormatted.sort((a, b) => {
    return b.price.comparedTo(a.price);
  });

  for (let order of askOrdersFormatted) {
    console.log(
      red("ASK"),
      "Price",
      order.price.toFixed(5).padEnd(15, " "),
      "| Sell",
      order.quoteUiAmount.toFixed(5).padStart(15, " "),
      order.quoteDisplay,
      "| For",
      order.baseUiAmount.toFixed(5).padStart(20, " "),
      order.baseDisplay,
      "| OrderId",
      order.orderAddress.toString(),
    );
  }

  for (let order of bidOrdersFormatted) {
    console.log(
      green("BID"),
      "Price",
      order.price.toFixed(5).padEnd(15, " "),
      "| Buy ",
      order.quoteUiAmount.toFixed(5).padStart(15, " "),
      order.quoteDisplay,
      "| For",
      order.baseUiAmount.toFixed(5).padStart(20, " "),
      order.baseDisplay,
      "| OrderId",
      order.orderAddress.toString(),
    );
  }
}

export async function getAllOrders() {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;

  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  const ordersAndAddresses =
    await client.getAllOrdersStateAndAddressForGlobalConfig();

  for (const order of ordersAndAddresses) {
    console.log(order.address.toBase58());
  }
}

async function getOrders(
  client: LimoClient,
  inTokenMint: PublicKey | undefined,
  outTokenMint: PublicKey | undefined,
): Promise<[Order, PublicKey][]> {
  let filters: GetProgramAccountsFilter[] = [];

  if (inTokenMint) {
    filters.push({
      memcmp: {
        bytes: inTokenMint.toBase58(),
        offset: 8 + 32 + 32,
      },
    });
  }
  if (outTokenMint) {
    filters.push({
      memcmp: {
        bytes: outTokenMint.toBase58(),
        offset: 8 + 32 + 32 + 32 + 32,
      },
    });
  }

  filters.push({
    dataSize: Order.layout.span + 8,
  });

  const state: [Order, PublicKey][] = (
    await client.getProgram().account.order.all(filters)
  ).map((x) => {
    return [new Order(x.account as unknown as OrderFields), x.publicKey];
  });

  return state;
}

export async function placeOrder(
  quoteToken: string | undefined,
  baseToken: string | undefined,
  uiAmount: number,
  price: number,
  type: "bid" | "ask",
) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;

  let base = new PublicKey((baseToken ?? process.env.BASE_TOKEN)!);
  let quote = new PublicKey((quoteToken ?? process.env.QUOTE_TOKEN)!);

  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  const mintTokenPrograms = await client.getMintsProgramOwners([base, quote]);
  const baseTokenProgram = mintTokenPrograms[0];
  const quoteTokenProgram = mintTokenPrograms[1];

  let orderAddress: PublicKey;
  let signature: string;

  if (type === "bid") {
    const [sig, order] = await client.placeBid(
      env.admin,
      quote,
      base,
      new Decimal(uiAmount), // baseUIAmount
      new Decimal(price),
      "execute",
      baseTokenProgram,
      quoteTokenProgram,
    );
    orderAddress = order.publicKey;
    signature = sig;
  } else {
    const [sig, order] = await client.placeAsk(
      env.admin,
      quote,
      base,
      new Decimal(uiAmount), // quoteUIAmount
      new Decimal(price),
      "execute",
      quoteTokenProgram,
      baseTokenProgram,
    );
    orderAddress = order.publicKey;
    signature = sig;
  }

  let orderState: Order | null = await Order.fetch(
    env.provider.connection,
    orderAddress,
    client.getProgramID(),
  );

  console.log("Place order", signature.toString());
}

export async function permissionlessTakeOrder(
  order: PublicKey,
  amountToTakeDecimals: number | undefined,
  tipAmountLamports: number | undefined,
  mode: string,
) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;
  const expressRelayProgramId = new PublicKey(
    process.env.EXPRESS_RELAY_PROGRAM_ID!,
  );

  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  const orderState = await Order.fetch(
    env.provider.connection,
    order,
    client.getProgramID(),
  );

  if (!orderState) {
    console.log("Order not found");
    return;
  }

  const mintDecimals = await client.getMintDecimals([
    orderState.inputMint,
    orderState.outputMint,
  ]);

  const inputAmountToTakeLamports = amountToTakeDecimals
    ? amountToLamportsBN(
        new Decimal(amountToTakeDecimals),
        mintDecimals.get(orderState.inputMint)!,
      )
    : orderState.initialInputAmount;

  const expectedOutputAmountDecimal = orderState.expectedOutputAmount
    .mul(inputAmountToTakeLamports)
    .div(orderState.initialInputAmount);

  await client.permissionlessTakeOrder(
    env.admin,
    {
      state: orderState,
      address: order,
    },
    inputAmountToTakeLamports,
    expectedOutputAmountDecimal,
    expressRelayProgramId,
    mode,
    tipAmountLamports ? new BN(tipAmountLamports) : new BN(0),
    mintDecimals,
  );
}

export async function listOrdersForUser(user: PublicKey) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;

  const env = initializeClient(rpc!, admin, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  // Time and print the duration of the line below
  let orders = await client.getAllOrdersDisplayForMaker(user);

  console.log(
    green(
      "Price".padStart(15, " ") +
        " |" +
        "Buy".padStart(7, " ").padEnd(62, " ") +
        " |" +
        "Sell".padStart(8, " ").padEnd(62, " ") +
        " |" +
        "Filled %".padStart(11, " ") +
        " |" +
        "OrderId".padStart(15, " "),
    ),
  );

  for (let order of orders) {
    console.log(
      green("->"),
      order.orderPriceInputToOutput.toFixed(5).padStart(12, " "),
      "|",
      order.expectedOutputAmountDecimal.toFixed(5).padStart(10, " "),
      order.state.outputMint.toString().padEnd(50, " "),
      "|",
      order.initialInputAmountDecimal.toFixed(5).padStart(10, " "),
      order.state.inputMint.toString().padEnd(50, " "),
      "|",
      order.orderFillPct.mul(100).toFixed(2).padStart(10, " "),
      "|",
      order.address.toString(),
    );
  }
}
