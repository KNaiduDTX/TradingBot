import { Connection } from '@solana/web3.js';
import { Logger } from './lib/logger';
import { TokenDetector } from './commands/detectTokens';
import { TradeEvaluator } from './commands/evaluateTrade';
import { ExitEngine } from './commands/exitEngine';
import { DatabaseManager } from './lib/database';
import { PriceFeedManager } from './lib/priceFeeds';
import { WalletValidator } from './lib/walletValidator';
import { TokenInfo } from './types';

// Ensure Trade type is defined
interface Trade {
  id: string;
  token: TokenInfo;
  amount: number;
  price: number;
  timestamp: Date;
}

export class TradingBot {
  private logger: Logger;
  private connection: Connection;
  private tokenDetector: TokenDetector;
  private tradeEvaluator: TradeEvaluator;
  private exitEngine: ExitEngine;
  private databaseManager: DatabaseManager;
  private priceFeedManager: PriceFeedManager;
  private walletValidator: WalletValidator;

  constructor(connection: Connection) {
    this.logger = new Logger('TradingBot');
    this.connection = connection;
    this.tokenDetector = new TokenDetector(connection);
    this.tradeEvaluator = new TradeEvaluator();
    this.exitEngine = new ExitEngine(connection);
    this.databaseManager = DatabaseManager.getInstance();
    this.priceFeedManager = new PriceFeedManager(connection);
    this.walletValidator = new WalletValidator(connection);
  }

  /**
   * Main trading loop
   */
  async runTradingLoop(): Promise<void> {
    try {
      this.logger.info('Starting trading loop');

      // Detect new tokens
      const tokens = await this.tokenDetector.detectNewTokens();
      this.logger.info(`Detected ${tokens.length} new tokens`);

      // Evaluate and execute trades
      for (const token of tokens) {
        try {
          // Validate wallet
          const walletRisk = await this.walletValidator.validateWallet(token.mint.toString());
          if (walletRisk.isScam) {
            this.logger.warn('Skipping token due to wallet risk', {
              tokenMint: token.mint.toString(),
              reasons: walletRisk.reasons
            });
            continue;
          }

          // Evaluate trade
          const signal = await this.tradeEvaluator.evaluateTrade(token);
          if (!signal) {
            this.logger.debug('No trade signal generated', {
              tokenMint: token.mint.toString()
            });
            continue;
          }

          // Execute trade
          const executed = await this.executeTrade(signal);
          if (executed) {
            this.logger.info('Trade executed successfully', {
              tokenMint: token.mint.toString(),
              signal
            });
          }
        } catch (error) {
          this.logger.error('Error processing token', {
            error: error instanceof Error ? error : new Error(String(error)),
            tokenMint: token.mint.toString()
          });
        }
      }

      // Check and execute exits
      await this.exitEngine.checkAndExecuteExits();

      this.logger.info('Trading loop completed');
    } catch (error) {
      this.logger.error('Error in trading loop', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Health check job
   */
  async healthCheck(): Promise<void> {
    try {
      this.logger.info('Running health check');

      // Check RPC connection
      const blockHeight = await this.connection.getBlockHeight();
      this.logger.info('RPC connection healthy', { blockHeight });

      // Check price feed
      const testPrice = await this.priceFeedManager.getPriceData('SOL');
      this.logger.info('Price feed healthy', { price: testPrice });

      // Check database
      await this.databaseManager.healthCheck();
      this.logger.info('Database healthy');

      this.logger.info('Health check completed successfully');
    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Execute a trade
   */
  private async executeTrade(signal: any): Promise<boolean> {
    // TODO: Implement actual trade execution
    // This would involve:
    // 1. Creating and signing the transaction
    // 2. Sending the transaction
    // 3. Confirming the transaction
    // 4. Updating the database
    return true;
  }
}

// Job runner sequence
export async function startTradingBot(connection: Connection): Promise<void> {
  const bot = new TradingBot(connection);

  // Run trading loop every 5 minutes
  setInterval(async () => {
    try {
      await bot.runTradingLoop();
    } catch (error) {
      console.error('Error in trading loop:', error);
    }
  }, 5 * 60 * 1000);

  // Run health check every hour
  setInterval(async () => {
    try {
      await bot.healthCheck();
    } catch (error) {
      console.error('Error in health check:', error);
    }
  }, 60 * 60 * 1000);
}

// TODO: Implement actual trade execution
async function executeTrade(trade: Trade): Promise<void> {
  // Simulate trade execution
  console.log(`Executing trade: ${JSON.stringify(trade)}`);
  // Add actual trade execution logic here
} 