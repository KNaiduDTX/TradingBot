import { Connection, PublicKey } from '@solana/web3.js';
import { Logger } from '../lib/logger';
import { TokenInfo, TradeResult } from '../types/index';
import { PriceFeedManager } from '../lib/priceFeeds';
import { DatabaseManager } from '../lib/database';

export interface ExitSignal {
  shouldExit: boolean;
  reason: string;
  currentPnL: number;
}

interface Position {
  id: string;
  token_mint: string;
  entry_price: number;
  amount: number;
  entry_time: string;
  stop_loss: number;
  take_profit: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
}

/**
 * Handles exit logic for open trading positions, including take-profit, stop-loss, and time-based exits.
 */
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
   * Maps a Position to a TradeResult-like object for exit logic.
   */
  private positionToTradeResult(pos: Position): TradeResult {
    return {
      token: {
        mint: new PublicKey(pos.token_mint),
        symbol: '',
        name: '',
        decimals: 0,
        supply: 0,
      },
      action: 'SELL',
      amount: pos.amount,
      price: pos.entry_price,
      timestamp: pos.entry_time,
      unrealizedPnL: pos.unrealizedPnL,
      realizedPnL: pos.realizedPnL,
    };
  }

  /**
   * Checks if a position should be exited based on PnL, stop-loss, or holding time.
   * @param trade The trade result to check exit conditions for.
   * @returns ExitSignal indicating whether to exit and the reason.
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
      const ts = typeof trade.timestamp === 'string' ? new Date(trade.timestamp) : trade.timestamp;
      const holdingTime = Date.now() - ts.getTime();
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
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Executes the exit for a given position, updating the database and logging the action.
   * @param pos The position to exit.
   * @param exitSignal The exit signal and reason.
   * @returns True if exit was successful, false otherwise.
   */
  async executeExit(pos: Position, exitSignal: ExitSignal): Promise<boolean> {
    try {
      this.logger.info('Executing exit', {
        positionId: pos.id,
        reason: exitSignal.reason,
        pnl: exitSignal.currentPnL
      });
      // For now, just update the database
      await this.databaseManager.updatePositionStatus(pos.token_mint, {
        ...pos,
        realizedPnL: exitSignal.currentPnL,
        unrealizedPnL: 0
      });
      return true;
    } catch (error) {
      this.logger.error('Error executing exit', {
        error: error instanceof Error ? error : new Error(String(error)),
        stack: error instanceof Error ? error.stack : undefined,
        positionId: pos.id
      });
      return false;
    }
  }

  /**
   * Checks and executes exits for all open positions in the database.
   */
  async checkAndExecuteExits(): Promise<void> {
    try {
      const openPositions = await this.databaseManager.getActivePositions();
      for (const pos of openPositions) {
        const tradeLike = this.positionToTradeResult(pos);
        const exitSignal = await this.checkExitConditions(tradeLike);
        if (exitSignal.shouldExit) {
          await this.executeExit(pos, exitSignal);
        }
      }
    } catch (error) {
      this.logger.error('Error checking and executing exits', {
        error: error instanceof Error ? error : new Error(String(error)),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
} 