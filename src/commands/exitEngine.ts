import { Connection, PublicKey } from '@solana/web3.js';
import { Logger } from '../lib/logger';
import { TokenInfo, TradeResult } from '../types';
import { PriceFeedManager } from '../lib/priceFeeds';
import { DatabaseManager } from '../lib/database';

export interface ExitSignal {
  shouldExit: boolean;
  reason: string;
  currentPnL: number;
}

export class ExitEngine {
  private logger: Logger;
  private connection: Connection;
  private priceFeedManager: PriceFeedManager;
  private databaseManager: DatabaseManager;
  
  // Exit thresholds
  private readonly TAKE_PROFIT_THRESHOLD = 0.15; // 15%
  private readonly STOP_LOSS_THRESHOLD = -0.10;  // -10%
  private readonly MAX_HOLDING_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(connection: Connection) {
    this.logger = new Logger('ExitEngine');
    this.connection = connection;
    this.priceFeedManager = new PriceFeedManager(connection);
    this.databaseManager = DatabaseManager.getInstance();
  }

  /**
   * Check if a position should be exited
   */
  async checkExitConditions(trade: TradeResult): Promise<ExitSignal> {
    try {
      // Get current price
      const currentPrice = await this.priceFeedManager.getPriceData(trade.token.mint.toString());
      
      // Calculate current PnL
      const entryValue = trade.amount * trade.price;
      const currentValue = trade.amount * currentPrice.price;
      const currentPnL = (currentValue - entryValue) / entryValue;

      // Check take-profit
      if (currentPnL >= this.TAKE_PROFIT_THRESHOLD) {
        return {
          shouldExit: true,
          reason: `Take profit triggered at ${(currentPnL * 100).toFixed(2)}%`,
          currentPnL
        };
      }

      // Check stop-loss
      if (currentPnL <= this.STOP_LOSS_THRESHOLD) {
        return {
          shouldExit: true,
          reason: `Stop loss triggered at ${(currentPnL * 100).toFixed(2)}%`,
          currentPnL
        };
      }

      // Check time-based exit
      const holdingTime = Date.now() - trade.timestamp.getTime();
      if (holdingTime >= this.MAX_HOLDING_TIME) {
        return {
          shouldExit: true,
          reason: `Maximum holding time reached (${(holdingTime / 1000 / 60).toFixed(0)} minutes)`,
          currentPnL
        };
      }

      return {
        shouldExit: false,
        reason: 'No exit conditions met',
        currentPnL
      };
    } catch (error) {
      this.logger.error('Error checking exit conditions', {
        error: error instanceof Error ? error : new Error(String(error)),
        tradeId: trade.id
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Execute exit for a position
   */
  async executeExit(trade: TradeResult, exitSignal: ExitSignal): Promise<boolean> {
    try {
      this.logger.info('Executing exit', {
        tradeId: trade.id,
        reason: exitSignal.reason,
        pnl: exitSignal.currentPnL
      });

      // TODO: Implement actual trade execution
      // This would involve:
      // 1. Creating a sell transaction
      // 2. Estimating slippage
      // 3. Executing the trade
      // 4. Updating the database

      // For now, just update the database
      await this.databaseManager.updateTradeStatus(trade.id, 'CLOSED', exitSignal.currentPnL);

      return true;
    } catch (error) {
      this.logger.error('Error executing exit', {
        error: error instanceof Error ? error : new Error(String(error)),
        tradeId: trade.id
      });
      return false;
    }
  }

  /**
   * Check and execute exits for all open positions
   */
  async checkAndExecuteExits(): Promise<void> {
    try {
      const openTrades = await this.databaseManager.getOpenTrades();
      
      for (const trade of openTrades) {
        const exitSignal = await this.checkExitConditions(trade);
        
        if (exitSignal.shouldExit) {
          await this.executeExit(trade, exitSignal);
        }
      }
    } catch (error) {
      this.logger.error('Error checking and executing exits', {
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

// TODO: Implement actual trade execution
async function executeTrade(trade: Trade): Promise<void> {
  // Simulate trade execution
  console.log(`Executing trade: ${JSON.stringify(trade)}`);
  // Add actual trade execution logic here
}

// Ensure Trade type is defined
interface Trade {
  id: string;
  token: TokenInfo;
  amount: number;
  price: number;
  timestamp: Date;
}

// Ensure TradeResult type is defined
interface TradeResult {
  id: string;
  token: TokenInfo;
  amount: number;
  price: number;
  timestamp: Date;
} 