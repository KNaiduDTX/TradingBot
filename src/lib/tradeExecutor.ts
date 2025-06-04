import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import { Logger } from './logger';
import { TokenInfo, TradeSignal, TradeResult } from '../types';
import { DatabaseManager } from './database';
import { PriceFeedManager } from './priceFeeds';
import axios from 'axios';

interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: number;
  outAmount: number;
  otherAmountThreshold: number;
  fee: number;
  priceImpactPct: number;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: number;
      outAmount: number;
      feeAmount: number;
      feeMint: string;
    };
    percent: number;
  }>;
}

interface JupiterSwapResponse {
  swapTransaction: string;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  slippage?: number;
  gasFees?: number;
  dexFees?: number;
  totalFees?: number;
}

export class TradeExecutor {
  private logger: Logger;
  private connection: Connection;
  private databaseManager: DatabaseManager;
  private priceFeedManager: PriceFeedManager;
  private readonly MAX_RETRIES = 3;
  private readonly MAX_SLIPPAGE = 0.015; // 1.5%
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

  constructor(connection: Connection) {
    this.logger = new Logger('TradeExecutor');
    this.connection = connection;
    this.databaseManager = new DatabaseManager();
    this.priceFeedManager = new PriceFeedManager(connection);
  }

  /**
   * Execute a trade with retries and slippage protection
   */
  async executeTrade(signal: TradeSignal, wallet: PublicKey): Promise<ExecutionResult> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < this.MAX_RETRIES) {
      try {
        // Get current price for slippage check
        const currentPrice = await this.priceFeedManager.getPriceData(signal.token.mint.toString());
        
        // Get quote from Jupiter
        const quoteResponse = await axios.get<JupiterQuoteResponse>(`${this.JUPITER_API_URL}/quote`, {
          params: {
            inputMint: signal.token.mint.toString(),
            outputMint: 'So11111111111111111111111111111111111111112', // SOL
            amount: signal.amount,
            slippageBps: Math.floor(this.MAX_SLIPPAGE * 10000)
          }
        });

        const quote = quoteResponse.data;
        
        // Check slippage
        const expectedPrice = signal.price;
        const actualPrice = quote.outAmount / quote.inAmount;
        const slippage = Math.abs(actualPrice - expectedPrice) / expectedPrice;

        if (slippage > this.MAX_SLIPPAGE) {
          throw new Error(`Slippage too high: ${slippage * 100}%`);
        }

        // Get swap transaction
        const swapResponse = await axios.post<JupiterSwapResponse>(`${this.JUPITER_API_URL}/swap`, {
          quoteResponse: quote,
          userPublicKey: wallet.toString(),
          wrapUnwrapSOL: true
        });

        const swapTransaction = swapResponse.data.swapTransaction;

        // Execute transaction
        const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
        const txHash = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [Keypair.fromSecretKey(Buffer.from(process.env.WALLET_PRIVATE_KEY || '', 'base64'))]
        );

        // Calculate fees
        const gasFees = quote.fee;
        const dexFees = quote.otherAmountThreshold ? 
          (quote.inAmount - quote.otherAmountThreshold) : 0;
        const totalFees = gasFees + dexFees;

        // Save trade result
        const tradeResult: TradeResult = {
          token: signal.token,
          action: signal.action,
          amount: signal.amount,
          price: actualPrice,
          timestamp: new Date().toISOString(),
          executionMetrics: {
            slippage,
            gasFees,
            dexFees,
            totalFees
          }
        };

        await this.databaseManager.saveTradeResult(tradeResult);

        return {
          success: true,
          txHash,
          slippage,
          gasFees,
          dexFees,
          totalFees
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn('Trade execution failed, retrying', {
          error: lastError,
          retryCount: retryCount + 1
        });
        
        retryCount++;
        if (retryCount < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retryCount));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error'
    };
  }

  /**
   * Simulate a trade without execution
   */
  async simulateTrade(signal: TradeSignal): Promise<ExecutionResult> {
    try {
      const quoteResponse = await axios.get<JupiterQuoteResponse>(`${this.JUPITER_API_URL}/quote`, {
        params: {
          inputMint: signal.token.mint.toString(),
          outputMint: 'So11111111111111111111111111111111111111112',
          amount: signal.amount,
          slippageBps: Math.floor(this.MAX_SLIPPAGE * 10000)
        }
      });

      const quote = quoteResponse.data;
      const expectedPrice = signal.price;
      const actualPrice = quote.outAmount / quote.inAmount;
      const slippage = Math.abs(actualPrice - expectedPrice) / expectedPrice;

      return {
        success: true,
        slippage,
        gasFees: quote.fee,
        dexFees: quote.otherAmountThreshold ? 
          (quote.inAmount - quote.otherAmountThreshold) : 0
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
} 