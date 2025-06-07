import { Connection, PublicKey } from '@solana/web3.js';
import { TokenDetector } from './commands/detectTokens';
import { TradeEvaluator } from './commands/evaluateTrade';
import { TradeExecutor } from './commands/executeTrade';
import { PnLMonitor } from './commands/monitorPnL';
import { Logger } from './lib/logger';
import dotenv from 'dotenv';
import { PythExpressRelay } from './integrations/pythExpressRelay';
import { DatabaseManager } from './lib/database';
import { TokenInfo } from './types/index';

// Load environment variables
dotenv.config();

class SolanaMemecoinBot {
  private connection: Connection;
  private tokenDetector: TokenDetector;
  private tradeEvaluator: TradeEvaluator;
  private tradeExecutor: TradeExecutor;
  private pnlMonitor: PnLMonitor;
  private logger: Logger;
  private relay: PythExpressRelay | null = null;

  constructor() {
    // Initialize logger first
    this.logger = new Logger('SolanaMemecoinBot');
    // Initialize Solana connection
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    // Initialize components
    this.tokenDetector = new TokenDetector(this.connection);
    this.tradeEvaluator = new TradeEvaluator();
    this.tradeExecutor = new TradeExecutor(this.connection);
    this.pnlMonitor = new PnLMonitor(this.connection, this.logger, DatabaseManager.getInstance());
  }

  /**
   * Start the trading bot
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting Solana Memecoin Trading Bot...');

      // Initialize ML model
      await this.tradeEvaluator.initializeModel();

      // Start Pyth Express Relay integration
      await this.initRelay();

      // Start main trading loop
      await this.tradingLoop();
    } catch (error) {
      this.logger.error('Error starting bot:', { error: error instanceof Error ? error : new Error(String(error)) });
      throw error;
    }
  }

  /**
   * Map a Pyth Express Relay opportunity to TokenInfo
   */
  private mapOpportunityToTokenInfo(opportunity: any): TokenInfo {
    // This mapping may need to be adjusted based on the actual opportunity structure
    return {
      mint: new PublicKey(opportunity.order_address),
      symbol: opportunity.symbol || 'UNKNOWN',
      name: opportunity.name || 'Pyth Opportunity',
      decimals: opportunity.decimals || 9,
      supply: opportunity.supply || 0,
      holders: opportunity.holders || 0,
      socialScore: opportunity.socialScore || 0,
      createdAt: new Date(),
    };
  }

  /**
   * Initialize Pyth Express Relay and wire opportunity callback
   */
  private async initRelay() {
    const bidStatusCallback = (status: any) => {
      this.logger.info('PythExpressRelay Bid Status', { status });
    };

    const opportunityCallback = async (opportunity: any) => {
      this.logger.info('PythExpressRelay Opportunity', { opportunity });
      try {
        // 1. Map opportunity to TokenInfo
        const tokenInfo = this.mapOpportunityToTokenInfo(opportunity);
        // 2. Use ML model to decide whether to bid
        const signal = await this.tradeEvaluator.evaluateTrade(tokenInfo);
        if (!signal) {
          this.logger.info('Opportunity did not pass ML evaluation, skipping bid.', { opportunityId: opportunity.order_address });
          return;
        }
        // 3. Submit bid if ML model returns a signal
        if (this.relay) {
          await this.relay.generateAndSubmitBid(opportunity);
          this.logger.info('Bid submitted for opportunity', { opportunityId: opportunity.order_address });
        }
      } catch (err) {
        this.logger.error('Error processing opportunity for bid', { error: err instanceof Error ? err : new Error(String(err)) });
      }
    };

    this.relay = await PythExpressRelay.getInstance(bidStatusCallback, opportunityCallback);
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
              // No trackTrade method; consider logging or monitoring here if needed
            }
          }
        }

        // Monitor PnL and log performance
        await this.pnlMonitor.monitor();

        // Wait before next iteration
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes
      } catch (error) {
        this.logger.error('Error in trading loop:', { error: error instanceof Error ? error : new Error(String(error)) });
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