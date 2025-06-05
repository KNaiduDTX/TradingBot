import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Order } from "../rpc_client/accounts/Order";
import Decimal from "decimal.js";

export type OrderStateAndAddress = {
  state: Order;
  address: PublicKey;
};

export type OrderDisplay = {
  address: PublicKey;
  state: Order;
  maker: PublicKey;
  initialInputAmountDecimal: Decimal;
  expectedOutputAmountDecimal: Decimal;
  remainingInputAmountDecimal: Decimal;
  filledOutputAmountDecimal: Decimal;
  orderFillPct: Decimal;
  orderPriceInputToOutput: Decimal;
  orderPriceOutputToInput: Decimal;
  executionPriceInputToOutput: Decimal;
  executionPriceOutputToInput: Decimal;
  orderTipLamports: Decimal;
  orderTipDecimal: Decimal;
  numberOfFills: number;
};

export type FilledOrder = {
  address: PublicKey;
  orderDisplay: OrderDisplay;
  quoteTokenMint: PublicKey;
  baseTokenMint: PublicKey;
  time: number;
  price: Decimal;
  size: Decimal;
  txid: string;
  type: "sell" | "buy";
};

export type FlashTakeOrderIxs = {
  createAtaIxs: TransactionInstruction[];
  startFlashIx: TransactionInstruction;
  endFlashIx: TransactionInstruction;
  closeWsolAtaIxs: TransactionInstruction[];
};

export type OrderListenerCallbackOnChange = (
  orderStateAndAddress: OrderStateAndAddress,
  slot: number,
) => void;

export class FilledOrderQueue<V> {
  private queue: FilledOrder[];
  private maxSize: number;

  constructor(maxSize: number = 10, initialOrders: FilledOrder[] = []) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  push(order: FilledOrder): void {
    // Check if the order is already in the queue
    const existingIndex = this.queue.findIndex((o) =>
      o.address.equals(order.address),
    );

    if (existingIndex !== -1) {
      // If the order already exists, remove it
      this.queue.splice(existingIndex, 1);
    }

    // Add the new order to the end of the queue
    this.queue.push(order);

    // Ensure only top `maxSize` orders are kept
    if (this.queue.length > this.maxSize) {
      this.queue.shift(); // Remove the oldest order
    }
  }

  pop(): FilledOrder | undefined {
    return this.queue.shift(); // Remove and return the oldest order
  }

  getOrders(): FilledOrder[] {
    return [...this.queue];
  }
}
