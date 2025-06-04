import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { TokenInfo, TradeSignal, TradeResult, PerformanceMetrics } from '../types/index';
import { Logger } from './logger';
import { config } from './config';
import path from 'path';
import { PublicKey } from '@solana/web3.js';

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

interface TradeRecord {
  token_mint: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  created_at: string;
  metadata: string;
  lp_locked: number;
  liquidity_usd: number;
  holders: number;
  social_score: number;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: string;
  tx_hash: string;
  fees: string;
  execution_metrics: string;
  position_id: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_percentage: number;
  holding_time: number;
}

/**
 * DatabaseManager handles all database operations for tokens, trades, positions, and metrics.
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database | null = null;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('DatabaseManager');
  }

  /**
   * Get the singleton instance of DatabaseManager
   */
  static getInstance(): DatabaseManager {
    if (!this.instance) {
      this.instance = new DatabaseManager();
    }
    return this.instance;
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    this.db = await open({
      filename: config.getConfig().dbPath,
      driver: sqlite3.Database
    });
    await this.createTables();
    this.logger.info('Database initialized');
  }

  /**
   * Create necessary database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        token_mint TEXT NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        decimals INTEGER NOT NULL,
        supply TEXT NOT NULL,
        created_at TEXT NOT NULL,
        action TEXT NOT NULL,
        amount REAL NOT NULL,
        price REAL NOT NULL,
        timestamp TEXT NOT NULL,
        exit_price TEXT,
        pnl REAL,
        execution_metrics TEXT
      );
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        timestamp TEXT NOT NULL
      );
    `);
  }

  /**
   * Save token information
   */
  async saveToken(token: TokenInfo): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(`
      INSERT OR REPLACE INTO tokens (
        mint, symbol, name, decimals, supply, created_at,
        last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      token.mint.toString(),
      token.symbol,
      token.name,
      token.decimals,
      token.supply,
      (token.createdAt ? token.createdAt : new Date()).toISOString(),
      new Date().toISOString()
    ]);
  }

  /**
   * Save trade result
   */
  public async saveTradeResult(trade: TradeResult): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run(`
        INSERT INTO trades (
          token_mint, symbol, name, decimals, supply, created_at,
          action, amount, price, timestamp,
          exit_price, pnl, execution_metrics
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        trade.token.mint,
        trade.token.symbol,
        trade.token.name,
        trade.token.decimals,
        trade.token.supply.toString(),
        (trade.token.createdAt ? trade.token.createdAt : new Date()).toISOString(),
        trade.action,
        trade.amount,
        trade.price,
        trade.timestamp,
        trade.exitTimestamp,
        trade.unrealizedPnL || 0,
        JSON.stringify(trade.executionMetrics)
      ]);

      this.logger.info('Trade result saved', { 
        token: trade.token.symbol,
        action: trade.action,
        amount: trade.amount
      });
    } catch (error: unknown) {
      this.logger.error('Error saving trade result', {
        error: error instanceof Error ? error : new Error(String(error)),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Update position status
   */
  public async updatePositionStatus(tokenMint: string, position: Position): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run(`
        UPDATE positions 
        SET unrealizedPnL = ?, realizedPnL = ?
        WHERE tokenMint = ?
      `, [position.unrealizedPnL || 0, position.realizedPnL || 0, tokenMint]);

      this.logger.info('Position status updated', { tokenMint });
    } catch (error: unknown) {
      this.logger.error('Error updating position status', {
        error: error instanceof Error ? error : new Error(String(error)),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get active positions
   */
  public async getActivePositions(): Promise<Position[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const positions = await this.db.all(`
        SELECT p.*, t.* 
        FROM positions p
        JOIN tokens t ON p.tokenMint = t.mint
        WHERE p.realizedPnL IS NULL
      `);

      return positions.map(p => ({
        id: p.id,
        token: {
          mint: p.mint,
          symbol: p.symbol,
          name: p.name
        },
        entryPrice: p.entryPrice,
        amount: p.amount,
        entryTime: typeof p.entryTime === 'string' ? p.entryTime : new Date(p.entryTime).toISOString(),
        stopLoss: p.stopLoss,
        takeProfit: p.takeProfit,
        unrealizedPnL: p.unrealizedPnL,
        realizedPnL: p.realizedPnL
      })) as unknown as Position[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error getting active positions', { error: error instanceof Error ? error : new Error(errorMessage) });
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * Save performance metrics
   */
  public async savePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.run(`
        INSERT INTO performance_metrics (
          totalPnL, winRate, avgTradeDuration,
          bestTradeToken, bestTradePnL,
          worstTradeToken, worstTradePnL,
          timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        metrics.totalPnL,
        metrics.winRate,
        metrics.avgTradeDuration,
        metrics.bestTrade.token.symbol,
        metrics.bestTrade.realizedPnL || 0,
        metrics.worstTrade.token.symbol,
        metrics.worstTrade.realizedPnL || 0,
        new Date().toISOString()
      ]);

      this.logger.info('Performance metrics saved', { 
        totalPnL: metrics.totalPnL,
        winRate: metrics.winRate
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error saving performance metrics', { error: error instanceof Error ? error : new Error(errorMessage) });
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * Get recent trades
   */
  public async getRecentTrades(limit: number = 10): Promise<TradeResult[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const trades = await this.db.all(`
        SELECT t.*, tk.* 
        FROM trades t
        JOIN tokens tk ON t.token_mint = tk.mint
        ORDER BY t.timestamp DESC
        LIMIT ?
      `, [limit]);

      return trades.map(t => ({
        token: {
          mint: t.token_mint,
          symbol: t.symbol,
          name: t.name
        },
        action: t.action,
        amount: t.amount,
        price: t.price,
        timestamp: typeof t.timestamp === 'string' ? t.timestamp : new Date(t.timestamp).toISOString(),
        exitTimestamp: t.exit_price,
        unrealizedPnL: t.pnl,
        realizedPnL: t.pnl,
        executionMetrics: t.execution_metrics ? JSON.parse(t.execution_metrics) : undefined
      })) as unknown as TradeResult[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error getting recent trades', { error: error instanceof Error ? error : new Error(errorMessage) });
      throw error instanceof Error ? error : new Error(errorMessage);
    }
  }

  /**
   * Get best and worst trades
   */
  private async getBestAndWorstTrades(): Promise<{ bestTrade: TradeResult; worstTrade: TradeResult }> {
    if (!this.db) throw new Error('Database not initialized');

    const trades = await this.db.all<TradeRecord[]>(`
      SELECT t.*, tk.*
      FROM trades t
      JOIN tokens tk ON t.token_mint = tk.mint
      WHERE t.pnl IS NOT NULL
      ORDER BY t.pnl DESC
    `);

    if (trades.length === 0) {
      const emptyTrade: TradeResult = {
        token: {
          mint: new PublicKey('11111111111111111111111111111111'),
          symbol: '',
          name: '',
          decimals: 0,
          supply: 0,
          createdAt: new Date()
        },
        action: 'BUY',
        amount: 0,
        price: 0,
        timestamp: new Date().toISOString(),
        realizedPnL: 0
      };
      return { bestTrade: emptyTrade, worstTrade: emptyTrade };
    }

    const bestTrade = this.mapTradeRecord(trades[0]);
    const worstTrade = this.mapTradeRecord(trades[trades.length - 1]);

    return { bestTrade, worstTrade };
  }

  /**
   * Get recent trades for performance metrics
   */
  private async getRecentTradesForMetrics(limit: number = 10): Promise<TradeResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const trades = await this.db.all<TradeRecord[]>(`
      SELECT t.*, tk.*
      FROM trades t
      JOIN tokens tk ON t.token_mint = tk.mint
      ORDER BY t.timestamp DESC
      LIMIT ?
    `, [limit]);

    return trades.map(t => this.mapTradeRecord(t));
  }

  /**
   * Map database trade record to TradeResult
   */
  private mapTradeRecord(t: TradeRecord): TradeResult {
    let metrics = { slippage: 0, gasFees: 0, dexFees: 0, totalFees: 0 };
    try {
      if (t.execution_metrics) {
        const parsed = JSON.parse(t.execution_metrics);
        metrics = {
          slippage: parsed.slippage || 0,
          gasFees: parsed.gasFees || 0,
          dexFees: parsed.dexFees || 0,
          totalFees: parsed.totalFees || 0
        };
      }
    } catch {
      // ignore parse errors, use defaults
    }
    return {
      token: {
        mint: new PublicKey(t.token_mint),
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        supply: t.supply,
        createdAt: new Date(t.created_at)
      },
      action: t.action,
      amount: t.amount,
      price: t.price,
      timestamp: typeof t.timestamp === 'string' ? t.timestamp : new Date(t.timestamp).toISOString(),
      exitTimestamp: t.exit_price ? String(t.exit_price) : undefined,
      unrealizedPnL: t.pnl || 0,
      realizedPnL: t.pnl || 0,
      executionMetrics: metrics
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    if (!this.db) throw new Error('Database not initialized');

    const metrics = await this.db.get(`
      SELECT *
      FROM performance_metrics
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    const { bestTrade, worstTrade } = await this.getBestAndWorstTrades();
    const recentTrades = await this.getRecentTradesForMetrics();

    if (!metrics) {
      return {
        totalPnL: 0,
        winRate: 0,
        avgTradeDuration: 0,
        bestTrade,
        worstTrade,
        recentTrades
      };
    }

    return {
      totalPnL: metrics.total_pnl,
      winRate: metrics.win_rate,
      avgTradeDuration: metrics.average_holding_time,
      bestTrade,
      worstTrade,
      recentTrades
    };
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(retentionDays: number = 90): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await this.db.run(`
      DELETE FROM trades
      WHERE timestamp < ?
    `, [cutoffDate.toISOString()]);

    await this.db.run(`
      DELETE FROM performance_metrics
      WHERE timestamp < ?
    `, [cutoffDate.toISOString()]);

    // Keep only the most recent metrics for each day
    await this.db.run(`
      DELETE FROM performance_metrics
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM performance_metrics
        GROUP BY date(timestamp)
      )
    `);

    this.logger.info('Database cleanup completed', { retentionDays });
  }

  /**
   * Optimize database
   */
  async optimizeDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('VACUUM');
    await this.db.run('ANALYZE');

    this.logger.info('Database optimization completed');
  }

  /**
   * Get position statistics
   */
  async getPositionStats(): Promise<{
    totalPositions: number;
    openPositions: number;
    averageHoldingTime: number;
    averagePnL: number;
    winRate: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = await this.db.get(`
      SELECT
        COUNT(*) as total_positions,
        SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_positions,
        AVG(CASE WHEN exit_time IS NOT NULL 
          THEN (julianday(exit_time) - julianday(entry_time)) * 24 * 60 * 60 
          ELSE NULL END) as avg_holding_time,
        AVG(pnl) as avg_pnl,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as win_rate
      FROM positions
    `);

    return {
      totalPositions: stats.total_positions || 0,
      openPositions: stats.open_positions || 0,
      averageHoldingTime: stats.avg_holding_time || 0,
      averagePnL: stats.avg_pnl || 0,
      winRate: stats.win_rate || 0
    };
  }

  /**
   * Get token statistics
   */
  async getTokenStats(): Promise<{
    totalTokens: number;
    activeTokens: number;
    averageLiquidity: number;
    averageHolders: number;
    averageSocialScore: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = await this.db.get(`
      SELECT
        COUNT(*) as total_tokens,
        COUNT(CASE WHEN last_updated > datetime('now', '-7 days') THEN 1 END) as active_tokens,
        AVG(liquidity_usd) as avg_liquidity,
        AVG(holders) as avg_holders,
        AVG(social_score) as avg_social_score
      FROM tokens
    `);

    return {
      totalTokens: stats.total_tokens || 0,
      activeTokens: stats.active_tokens || 0,
      averageLiquidity: stats.avg_liquidity || 0,
      averageHolders: stats.avg_holders || 0,
      averageSocialScore: stats.avg_social_score || 0
    };
  }

  /**
   * Get trade statistics
   */
  async getTradeStats(): Promise<{
    totalTrades: number;
    profitableTrades: number;
    averagePnL: number;
    averageExecutionTime: number;
    averageSlippage: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = await this.db.get(`
      SELECT
        COUNT(*) as total_trades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as profitable_trades,
        AVG(pnl) as avg_pnl,
        AVG(json_extract(execution_metrics, '$.executionTime')) as avg_execution_time,
        AVG(json_extract(execution_metrics, '$.slippage')) as avg_slippage
      FROM trades
    `);

    return {
      totalTrades: stats.total_trades || 0,
      profitableTrades: stats.profitable_trades || 0,
      averagePnL: stats.avg_pnl || 0,
      averageExecutionTime: stats.avg_execution_time || 0,
      averageSlippage: stats.avg_slippage || 0
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  /**
   * Check database health by executing a simple query
   */
  async healthCheck(): Promise<void> {
    try {
      if (!this.db) {
        throw new Error('Database connection not initialized');
      }
      const stmt = await this.db.prepare('SELECT 1');
      await stmt.run();
    } catch (error) {
      throw new Error(`Database health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async logTrade(trade: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run(
      'INSERT INTO trades (id, token_mint, symbol, name, decimals, supply, created_at, action, amount, price, timestamp, exit_price, pnl, execution_metrics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        trade.id,
        trade.token.mint.toString(),
        trade.token.symbol,
        trade.token.name,
        trade.token.decimals,
        trade.token.supply.toString(),
        trade.token.createdAt.toISOString(),
        trade.action,
        trade.amount,
        trade.price,
        trade.timestamp,
        trade.exitTimestamp,
        trade.unrealizedPnL,
        JSON.stringify(trade.executionMetrics)
      ]
    );
    this.logger.info('Trade logged', { tradeId: trade.id });
  }

  async log(level: string, message: string, metadata?: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run(
      'INSERT INTO logs (level, message, metadata, timestamp) VALUES (?, ?, ?, ?)',
      [level, message, JSON.stringify(metadata), new Date().toISOString()]
    );
  }
} 