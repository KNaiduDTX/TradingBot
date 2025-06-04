import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { TokenInfo, TradeSignal, TradeResult, PerformanceMetrics } from '../types';
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

export class DatabaseManager {
  private db: Database | null = null;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DatabaseManager');
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      this.db = await open({
        filename: config.getConfig().dbPath,
        driver: sqlite3.Database
      });

      await this.createTables();
      this.logger.info('Database initialized successfully');
    } catch (error: unknown) {
      this.logger.error('Failed to initialize database:', { error: error as Error });
      throw error;
    }
  }

  /**
   * Create necessary database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS tokens (
        mint TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        decimals INTEGER NOT NULL,
        supply INTEGER NOT NULL,
        created_at DATETIME NOT NULL,
        metadata TEXT,
        lp_locked BOOLEAN,
        liquidity_usd REAL,
        holders INTEGER,
        social_score REAL,
        last_updated DATETIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        token_mint TEXT NOT NULL,
        action TEXT NOT NULL,
        amount REAL NOT NULL,
        price REAL NOT NULL,
        timestamp DATETIME NOT NULL,
        tx_hash TEXT NOT NULL,
        fees TEXT NOT NULL,
        execution_metrics TEXT NOT NULL,
        position_id TEXT NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL,
        pnl REAL,
        pnl_percentage REAL,
        holding_time INTEGER,
        FOREIGN KEY (token_mint) REFERENCES tokens(mint)
      );

      CREATE TABLE IF NOT EXISTS positions (
        id TEXT PRIMARY KEY,
        token_mint TEXT NOT NULL,
        entry_price REAL NOT NULL,
        amount REAL NOT NULL,
        entry_time DATETIME NOT NULL,
        exit_time DATETIME,
        exit_price REAL,
        pnl REAL,
        pnl_percentage REAL,
        status TEXT NOT NULL,
        stop_loss REAL,
        take_profit REAL,
        FOREIGN KEY (token_mint) REFERENCES tokens(mint)
      );

      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME NOT NULL,
        total_pnl REAL NOT NULL,
        win_rate REAL NOT NULL,
        sharpe_ratio REAL NOT NULL,
        max_drawdown REAL NOT NULL,
        average_return REAL NOT NULL,
        volatility REAL NOT NULL,
        total_trades INTEGER NOT NULL,
        profitable_trades INTEGER NOT NULL,
        average_holding_time INTEGER NOT NULL
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
        metadata, lp_locked, liquidity_usd, holders,
        social_score, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      token.mint.toString(),
      token.symbol,
      token.name,
      token.decimals,
      token.supply,
      token.createdAt.toISOString(),
      JSON.stringify(token.metadata),
      token.lpLocked ? 1 : 0,
      token.liquidityUSD,
      token.holders,
      token.socialScore,
      new Date().toISOString()
    ]);
  }

  /**
   * Save trade result
   */
  async saveTrade(trade: TradeResult): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(`
      INSERT INTO trades (
        id, token_mint, action, amount, price, timestamp,
        tx_hash, fees, execution_metrics, position_id,
        entry_price, exit_price, pnl, pnl_percentage,
        holding_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      trade.positionId,
      trade.token.mint.toString(),
      trade.action,
      trade.amount,
      trade.price,
      trade.timestamp.toISOString(),
      trade.txHash,
      JSON.stringify(trade.fees),
      JSON.stringify(trade.executionMetrics),
      trade.positionId,
      trade.entryPrice,
      trade.currentPrice,
      trade.unrealizedPnL,
      trade.pnlPercentage,
      trade.holdingTime
    ]);
  }

  /**
   * Update position status
   */
  async updatePosition(
    positionId: string,
    updates: {
      exitTime?: Date;
      exitPrice?: number;
      pnl?: number;
      pnlPercentage?: number;
      status: 'OPEN' | 'CLOSED' | 'STOPPED';
    }
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields = [];
    const values = [];

    if (updates.exitTime) {
      fields.push('exit_time = ?');
      values.push(updates.exitTime.toISOString());
    }
    if (updates.exitPrice) {
      fields.push('exit_price = ?');
      values.push(updates.exitPrice);
    }
    if (updates.pnl) {
      fields.push('pnl = ?');
      values.push(updates.pnl);
    }
    if (updates.pnlPercentage) {
      fields.push('pnl_percentage = ?');
      values.push(updates.pnlPercentage);
    }
    fields.push('status = ?');
    values.push(updates.status);

    values.push(positionId);

    await this.db.run(`
      UPDATE positions
      SET ${fields.join(', ')}
      WHERE id = ?
    `, values);
  }

  /**
   * Save performance metrics
   */
  async savePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(`
      INSERT INTO performance_metrics (
        timestamp, total_pnl, win_rate, sharpe_ratio,
        max_drawdown, average_return, volatility,
        total_trades, profitable_trades, average_holding_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      new Date().toISOString(),
      metrics.totalPnL,
      metrics.winRate,
      metrics.sharpeRatio,
      metrics.maxDrawdown,
      metrics.averageReturn,
      metrics.volatility,
      metrics.totalTrades,
      metrics.profitableTrades,
      metrics.averageHoldingTime
    ]);
  }

  /**
   * Get active positions
   */
  async getActivePositions(): Promise<Array<{
    id: string;
    tokenMint: string;
    entryPrice: number;
    amount: number;
    entryTime: Date;
    stopLoss: number;
    takeProfit: number;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    const positions = await this.db.all<Position[]>(`
      SELECT id, token_mint, entry_price, amount,
             entry_time, stop_loss, take_profit
      FROM positions
      WHERE status = 'OPEN'
    `);

    return positions.map((p: Position) => ({
      id: p.id,
      tokenMint: p.token_mint,
      entryPrice: p.entry_price,
      amount: p.amount,
      entryTime: new Date(p.entry_time),
      stopLoss: p.stop_loss,
      takeProfit: p.take_profit
    }));
  }

  /**
   * Get recent trades
   */
  async getRecentTrades(limit: number = 100): Promise<TradeResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const trades = await this.db.all<TradeRecord[]>(`
      SELECT t.*, tk.*
      FROM trades t
      JOIN tokens tk ON t.token_mint = tk.mint
      ORDER BY t.timestamp DESC
      LIMIT ?
    `, [limit]);

    return trades.map((t: TradeRecord) => ({
      token: {
        mint: new PublicKey(t.token_mint),
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        supply: t.supply,
        createdAt: new Date(t.created_at),
        metadata: JSON.parse(t.metadata),
        lpLocked: Boolean(t.lp_locked),
        liquidityUSD: t.liquidity_usd,
        holders: t.holders,
        socialScore: t.social_score
      },
      action: t.action,
      amount: t.amount,
      price: t.price,
      timestamp: new Date(t.timestamp),
      txHash: t.tx_hash,
      fees: JSON.parse(t.fees),
      executionMetrics: JSON.parse(t.execution_metrics),
      positionId: t.position_id,
      entryPrice: t.entry_price,
      currentPrice: t.exit_price,
      unrealizedPnL: t.pnl,
      pnlPercentage: t.pnl_percentage,
      holdingTime: t.holding_time
    }));
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
      timestamp: new Date(),
      txHash: '',
      fees: { gas: 0, dex: 0, total: 0 },
      executionMetrics: { slippage: 0, priceImpact: 0, executionTime: 0 },
      positionId: '',
      entryPrice: 0
    };

    if (!metrics) {
      return {
        totalPnL: 0,
        winRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        averageReturn: 0,
        volatility: 0,
        totalTrades: 0,
        profitableTrades: 0,
        averageHoldingTime: 0,
        bestTrade: emptyTrade,
        worstTrade: emptyTrade,
        recentTrades: []
      };
    }

    return {
      totalPnL: metrics.total_pnl,
      winRate: metrics.win_rate,
      sharpeRatio: metrics.sharpe_ratio,
      maxDrawdown: metrics.max_drawdown,
      averageReturn: metrics.average_return,
      volatility: metrics.volatility,
      totalTrades: metrics.total_trades,
      profitableTrades: metrics.profitable_trades,
      averageHoldingTime: metrics.average_holding_time,
      bestTrade: emptyTrade, // TODO: Implement
      worstTrade: emptyTrade, // TODO: Implement
      recentTrades: [] // TODO: Implement
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
} 