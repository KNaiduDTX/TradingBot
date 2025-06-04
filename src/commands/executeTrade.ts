import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { TokenInfo, TradeSignal, TradeResult } from '../types/index';
import { Logger, LogMetadata } from '../lib/logger';
import axios from 'axios';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { config } from '../lib/config';
import bs58 from 'bs58';

interface JupiterRoute {
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  marketInfos: Array<{
    label: string;
    lpFee: {
      amount: string;
      mint: string;
    };
    platformFee: {
      amount: string;
      mint: string;
    };
  }>;
  amount: string;
  slippageBps: number;
  otherAmountThreshold: string;
  swapMode: string;
  priceImpact: number;
}

interface JupiterSwapResponse {
  swapTransaction: string;
}

class TradeError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'TradeError';
  }
}

/**
 * TradeExecutor executes trades on Solana using Jupiter and handles transaction signing, validation, and logging.
 */
export class TradeExecutor {
  private connection: Connection;
  private logger: Logger;
  private readonly JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
  private readonly MAX_SLIPPAGE_BPS: number;
  private readonly MIN_LIQUIDITY_USD: number;

  constructor(connection: Connection) {
    this.connection = connection;
    this.logger = new Logger('TradeExecutor');
    const cfg = config.getConfig();
    this.MAX_SLIPPAGE_BPS = cfg.maxSlippageBps || 150;
    this.MIN_LIQUIDITY_USD = cfg.minLiquidityUSD || 10000;
  }

  /**
   * Execute a trade based on the trade signal
   * @param signal Trade signal to execute
   * @returns Result of the trade execution
   */
  async executeTrade(signal: TradeSignal): Promise<TradeResult> {
    try {
      this.logger.info(`Executing ${signal.action} trade for ${signal.token.symbol}`, {
        tokenMint: signal.token.mint.toString(),
        amount: signal.suggestedSize
      });
      const route = await this.getBestRoute(signal);
      if (!this.validateRoute(route, signal)) {
        throw new TradeError('Invalid route: slippage or liquidity too high');
      }
      const startTime = Date.now();
      const txHash = await this.executeSwap(route, signal);
      const executionTime = Date.now() - startTime;
      const fees = this.calculateFees(route);
      const result: TradeResult = {
        token: signal.token,
        action: signal.action,
        amount: parseFloat(route.inAmount) / Math.pow(10, signal.token.decimals),
        price: signal.price,
        timestamp: new Date().toISOString(),
        executionMetrics: {
          slippage: route.priceImpactPct,
          gasFees: 0, // Placeholder, update as needed
          dexFees: 0, // Placeholder, update as needed
          totalFees: 0 // Placeholder, update as needed
        }
      };
      this.logger.trade('Trade executed successfully', {
        tokenMint: signal.token.mint.toString(),
        txHash,
        amount: result.amount
      });
      return result;
    } catch (error: unknown) {
      const tradeError = error instanceof Error ? error : new TradeError(String(error));
      const metadata: LogMetadata = {
        tokenMint: signal.token.mint.toString(),
        error: tradeError,
        stack: tradeError.stack
      };
      this.logger.error('Error executing trade', metadata);
      throw tradeError;
    }
  }

  /**
   * Get best trading route from Jupiter
   */
  private async getBestRoute(signal: TradeSignal): Promise<JupiterRoute> {
    try {
      const response = await axios.get<JupiterRoute>(`${this.JUPITER_API_URL}/quote`, {
        params: {
          inputMint: 'So11111111111111111111111111111111111111112', // SOL
          outputMint: signal.token.mint.toString(),
          amount: Math.floor(signal.suggestedSize * Math.pow(10, 9)), // Convert to lamports
          slippageBps: this.MAX_SLIPPAGE_BPS
        }
      });

      return response.data;
    } catch (error: unknown) {
      const tradeError = error instanceof Error ? error : new TradeError(String(error));
      const metadata: LogMetadata = {
        tokenMint: signal.token.mint.toString(),
        error: tradeError,
        status: error instanceof Error && 'response' in error ? (error as any).response?.status : undefined
      };
      this.logger.error('Error getting Jupiter route', metadata);
      throw tradeError;
    }
  }

  /**
   * Validate route parameters
   */
  private validateRoute(route: JupiterRoute, signal: TradeSignal): boolean {
    // Check slippage
    if (route.priceImpactPct > this.MAX_SLIPPAGE_BPS / 100) {
      this.logger.warn('Slippage too high', {
        priceImpact: route.priceImpactPct,
        maxAllowed: this.MAX_SLIPPAGE_BPS / 100
      });
      return false;
    }

    // Check liquidity
    const liquidityUSD = this.estimateLiquidityUSD(route);
    if (liquidityUSD < this.MIN_LIQUIDITY_USD) {
      this.logger.warn('Insufficient liquidity', {
        liquidityUSD,
        minRequired: this.MIN_LIQUIDITY_USD
      });
      return false;
    }

    return true;
  }

  /**
   * Execute swap transaction
   */
  private async executeSwap(route: JupiterRoute, signal: TradeSignal): Promise<string> {
    try {
      // Get swap transaction
      const swapResponse = await axios.post<JupiterSwapResponse>(`${this.JUPITER_API_URL}/swap`, {
        route,
        userPublicKey: process.env.WALLET_PUBLIC_KEY,
        wrapUnwrapSOL: true
      });

      // Sign and send transaction
      const transaction = Transaction.from(Buffer.from(swapResponse.data.swapTransaction, 'base64'));
      const signedTx = await this.signAndSendTransaction(transaction);

      return signedTx;
    } catch (error: unknown) {
      const tradeError = error instanceof Error ? error : new TradeError(String(error));
      const metadata: LogMetadata = {
        tokenMint: signal.token.mint.toString(),
        error: tradeError,
        status: error instanceof Error && 'response' in error ? (error as any).response?.status : undefined
      };
      this.logger.error('Error executing swap', metadata);
      throw tradeError;
    }
  }

  /**
   * Sign and send transaction
   */
  private async signAndSendTransaction(transaction: Transaction): Promise<string> {
    try {
      // Get wallet keypair from private key
      const privateKey = bs58.decode(config.getConfig().walletPrivateKey);
      const keypair = Keypair.fromSecretKey(privateKey);

      // Sign transaction
      transaction.sign(keypair);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new TradeError(`Transaction failed: ${confirmation.value.err}`);
      }

      this.logger.info('Transaction confirmed', { signature });
      return signature;
    } catch (error: unknown) {
      const tradeError = error instanceof Error ? error : new TradeError(String(error));
      this.logger.error('Error signing and sending transaction', { error: tradeError });
      throw tradeError;
    }
  }

  /**
   * Calculate fees from route
   */
  private calculateFees(route: JupiterRoute): { gas: number; dex: number; total: number } {
    const lpFees = route.marketInfos.reduce((sum, info) => 
      sum + parseFloat(info.lpFee.amount), 0);
    
    const platformFees = route.marketInfos.reduce((sum, info) => 
      sum + parseFloat(info.platformFee.amount), 0);

    // Estimate gas fees based on transaction size and network conditions
    const estimatedGas = 0.000005 * (route.marketInfos.length + 1); // Base fee + per hop fee

    return {
      gas: estimatedGas,
      dex: lpFees + platformFees,
      total: estimatedGas + lpFees + platformFees
    };
  }

  /**
   * Estimate liquidity in USD
   */
  private estimateLiquidityUSD(route: JupiterRoute): number {
    // Simple estimation based on route amounts
    return parseFloat(route.outAmount) * 2; // Assuming 50/50 pool
  }

  /**
   * Generate unique position ID
   */
  private generatePositionId(signal: TradeSignal): string {
    return `${signal.token.mint.toString()}-${Date.now()}`;
  }

  /**
   * Calculate optimal trade size based on risk parameters
   */
  calculateTradeSize(signal: TradeSignal, balance: number): number {
    // Use the suggested size from the trade signal
    return Math.min(signal.suggestedSize, balance);
  }

  /**
   * Validate trade execution conditions
   */
  async validateTradeConditions(signal: TradeSignal): Promise<boolean> {
    try {
      // Get route to check liquidity and slippage
      const route = await this.getBestRoute(signal);
      
      // Validate route parameters
      return this.validateRoute(route, signal);
    } catch (error: unknown) {
      const tradeError = error instanceof Error ? error : new TradeError(String(error));
      const metadata: LogMetadata = {
        tokenMint: signal.token.mint.toString(),
        error: tradeError
      };
      this.logger.error('Error validating trade conditions', metadata);
      return false;
    }
  }
} 