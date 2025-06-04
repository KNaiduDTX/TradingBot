import { Connection, PublicKey } from '@solana/web3.js';
import { Logger, LogMetadata } from '../lib/logger';
import { TokenInfo, TradeResult, PerformanceMetrics } from '../types/index';
import { DatabaseManager } from '../lib/database';
import { config } from '../lib/config';
import { format } from 'date-fns';
import { getTokenPrice } from '../lib/marketData';

/**
 * PnLMonitor monitors open positions, calculates PnL, and generates performance reports.
 */
export class PnLMonitor {
  private connection: Connection;
  private logger: Logger;
  private db: DatabaseManager;

  constructor(connection: Connection, logger: Logger, db: DatabaseManager) {
    this.connection = connection;
    this.logger = logger;
    this.db = db;
  }

  /**
   * Calculate PnL for a position
   */
  private calculatePnL(position: TradeResult, currentPrice: number): number {
    const entryValue = position.amount * position.price;
    const currentValue = position.amount * currentPrice;
    return currentValue - entryValue;
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformanceMetrics(): Promise<PerformanceMetrics> {
    const trades = await this.db.getRecentTrades(100); // Get last 100 trades
    const positions = await this.db.getActivePositions();
    
    // Calculate total PnL
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.realizedPnL || 0), 0);
    
    // Calculate win rate
    const winningTrades = trades.filter(trade => (trade.realizedPnL || 0) > 0);
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    
    // Calculate average trade duration
    const tradeDurations = trades.map(trade => {
      const entryTime = new Date(trade.timestamp).getTime();
      const exitTime = trade.exitTimestamp ? new Date(trade.exitTimestamp).getTime() : Date.now();
      return (exitTime - entryTime) / (1000 * 60 * 60); // Convert to hours
    });
    const avgTradeDuration = tradeDurations.length > 0 
      ? tradeDurations.reduce((sum, duration) => sum + duration, 0) / tradeDurations.length 
      : 0;

    // Calculate best and worst trades
    const bestTrade = trades.reduce((best, current) => 
      (current.realizedPnL || 0) > (best.realizedPnL || 0) ? current : best, trades[0] || null);
    const worstTrade = trades.reduce((worst, current) => 
      (current.realizedPnL || 0) < (worst.realizedPnL || 0) ? current : worst, trades[0] || null);

    return {
      totalPnL,
      winRate,
      avgTradeDuration,
      bestTrade: bestTrade || {
        token: { mint: '', symbol: '', name: '' },
        action: 'BUY',
        amount: 0,
        price: 0,
        timestamp: new Date().toISOString(),
        realizedPnL: 0
      },
      worstTrade: worstTrade || {
        token: { mint: '', symbol: '', name: '' },
        action: 'BUY',
        amount: 0,
        price: 0,
        timestamp: new Date().toISOString(),
        realizedPnL: 0
      },
      recentTrades: trades.slice(0, 10) // Last 10 trades
    };
  }

  /**
   * Generate performance report
   */
  private async generateReport(metrics: PerformanceMetrics): Promise<string> {
    const report = [
      '=== Performance Report ===',
      `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
      '',
      'Overall Performance:',
      `Total PnL: ${metrics.totalPnL.toFixed(4)} SOL`,
      `Win Rate: ${(metrics.winRate * 100).toFixed(2)}%`,
      `Average Trade Duration: ${metrics.avgTradeDuration.toFixed(2)} hours`,
      '',
      'Best Trade:',
      `Token: ${metrics.bestTrade.token.symbol}`,
      `PnL: ${metrics.bestTrade.realizedPnL?.toFixed(4)} SOL`,
      '',
      'Worst Trade:',
      `Token: ${metrics.worstTrade.token.symbol}`,
      `PnL: ${metrics.worstTrade.realizedPnL?.toFixed(4)} SOL`,
      '',
      'Recent Trades:',
      ...metrics.recentTrades.map(trade => 
        `${trade.token.symbol}: ${trade.action} ${trade.amount} @ ${trade.price} (PnL: ${trade.realizedPnL?.toFixed(4)} SOL)`
      )
    ].join('\n');

    return report;
  }

  /**
   * Monitor positions and calculate PnL
   */
  public async monitor(): Promise<void> {
    try {
      const positions = await this.db.getActivePositions();
      
      // Calculate PnL for each position
      for (const position of positions) {
        const mint = (position as any).tokenMint || (position as any).token_mint;
        const symbol = (position as any).symbol || '';
        const currentPrice = await this.getCurrentPrice(mint);
        const pnl = this.calculatePnL({
          token: {
            mint,
            symbol,
            name: '',
            decimals: 0,
            supply: 0,
            createdAt: new Date()
          },
          action: 'BUY',
          amount: (position as any).amount,
          price: (position as any).entryPrice || (position as any).entry_price,
          timestamp: typeof (position as any).entryTime === 'string' ? (position as any).entryTime : ((position as any).entry_time ? (typeof (position as any).entry_time === 'string' ? (position as any).entry_time : new Date((position as any).entry_time).toISOString()) : new Date().toISOString())
        }, currentPrice);
        
        // Update position with current PnL
        await this.db.updatePositionStatus(mint, {
          ...position,
          unrealizedPnL: pnl
        });

        this.logger.info('Position PnL updated', {
          token: symbol,
          pnl,
          currentPrice
        });
      }

      // Calculate and save performance metrics
      const metrics = await this.calculatePerformanceMetrics();
      await this.db.savePerformanceMetrics(metrics);

      // Generate and log report
      const report = await this.generateReport(metrics);
      this.logger.info('Performance report generated', { report });

    } catch (error: unknown) {
      this.logger.error('Error monitoring PnL', {
        error: error instanceof Error ? error : new Error(String(error)),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get current price for a token
   */
  private async getCurrentPrice(mint: string): Promise<number> {
    return getTokenPrice(mint);
  }
} 