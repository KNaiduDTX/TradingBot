import { Connection } from '@solana/web3.js';
import { TokenDetector } from './commands/detectTokens';
import { TradeEvaluator } from './commands/evaluateTrade';
import { TradeExecutor } from './commands/executeTrade';
import { PnLMonitor } from './commands/monitorPnL';
import { Logger } from './lib/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class SolanaMemecoinBot {
  private connection: Connection;
  private tokenDetector: TokenDetector;
  private tradeEvaluator: TradeEvaluator;
  private tradeExecutor: TradeExecutor;
  private pnlMonitor: PnLMonitor;
  private logger: Logger;

  constructor() {
    // Initialize Solana connection
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    // Initialize components
    this.tokenDetector = new TokenDetector(this.connection);
    this.tradeEvaluator = new TradeEvaluator();
    this.tradeExecutor = new TradeExecutor(this.connection);
    this.pnlMonitor = new PnLMonitor(this.connection);
    this.logger = new Logger('SolanaMemecoinBot');
  }

  /**
   * Start the trading bot
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting Solana Memecoin Trading Bot...');

      // Initialize ML model
      await this.tradeEvaluator.initializeModel();

      // Start main trading loop
      await this.tradingLoop();
    } catch (error) {
      this.logger.error('Error starting bot:', error);
      throw error;
    }
  }

  /**
   * Main trading loop
   */
  private async tradingLoop(): Promise<void> {
    while (true) {
      try {
        // Detect new tokens
        const newTokens = await this.tokenDetector.detectNewTokens();

        // Evaluate and execute trades
        for (const token of newTokens) {
          const signal = await this.tradeEvaluator.evaluateTrade(token);
          
          if (signal) {
            const canExecute = await this.tradeExecutor.validateTradeConditions(signal);
            
            if (canExecute) {
              const result = await this.tradeExecutor.executeTrade(signal);
              await this.pnlMonitor.trackTrade(result);
            }
          }
        }

        // Generate performance report
        const report = await this.pnlMonitor.generateReport();
        this.logger.info('Performance Report:', report);

        // Wait before next iteration
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes
      } catch (error) {
        this.logger.error('Error in trading loop:', error);
        // Continue running despite errors
      }
    }
  }
}

// Start the bot
const bot = new SolanaMemecoinBot();
bot.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 