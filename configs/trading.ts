import { PublicKey } from '@solana/web3.js';

export interface TradingConfig {
  // Strategy Parameters
  strategy: 'momentum' | 'mean_reversion' | 'breakout';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  lookbackPeriod: number;
  
  // Entry Rules
  minVolume24h: number;
  minLiquidityUSD: number;
  minHolders: number;
  maxSpreadPercentage: number;
  
  // Exit Rules
  takeProfitLevels: number[];
  stopLossLevels: number[];
  trailingStopPercentage: number;
  
  // Position Sizing
  basePositionSize: number;
  positionSizeMultiplier: number;
  maxPositions: number;
  
  // Risk Management
  maxDrawdown: number;
  maxDailyLoss: number;
  maxConsecutiveLosses: number;
  
  // Market Filters
  minMarketCap: number;
  maxPriceImpact: number;
  blacklistedTokens: PublicKey[];
  
  // Technical Indicators
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  macdFastPeriod: number;
  macdSlowPeriod: number;
  macdSignalPeriod: number;
}

export const defaultTradingConfig: TradingConfig = {
  // Strategy Parameters
  strategy: 'momentum',
  timeframe: '5m',
  lookbackPeriod: 24, // hours
  
  // Entry Rules
  minVolume24h: 50000, // $50k
  minLiquidityUSD: 10000, // $10k
  minHolders: 100,
  maxSpreadPercentage: 2, // 2%
  
  // Exit Rules
  takeProfitLevels: [0.1, 0.2, 0.3], // 10%, 20%, 30%
  stopLossLevels: [-0.05, -0.1, -0.15], // -5%, -10%, -15%
  trailingStopPercentage: 0.05, // 5%
  
  // Position Sizing
  basePositionSize: 0.1, // SOL
  positionSizeMultiplier: 1.5,
  maxPositions: 5,
  
  // Risk Management
  maxDrawdown: 0.1, // 10%
  maxDailyLoss: 0.05, // 5%
  maxConsecutiveLosses: 3,
  
  // Market Filters
  minMarketCap: 100000, // $100k
  maxPriceImpact: 0.02, // 2%
  blacklistedTokens: [],
  
  // Technical Indicators
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  macdFastPeriod: 12,
  macdSlowPeriod: 26,
  macdSignalPeriod: 9
};

export class TradingStrategy {
  private config: TradingConfig;
  
  constructor(config: Partial<TradingConfig> = {}) {
    this.config = { ...defaultTradingConfig, ...config };
  }
  
  public validateEntry(token: PublicKey, price: number, volume: number, liquidity: number): boolean {
    return (
      volume >= this.config.minVolume24h &&
      liquidity >= this.config.minLiquidityUSD &&
      price > 0
    );
  }
  
  public calculatePositionSize(confidence: number, availableBalance: number): number {
    const baseSize = this.config.basePositionSize;
    const multiplier = this.config.positionSizeMultiplier;
    
    // Scale position size based on confidence
    const scaledSize = baseSize * (1 + (confidence * multiplier));
    
    // Ensure we don't exceed available balance
    return Math.min(scaledSize, availableBalance * 0.1); // Max 10% of balance
  }
  
  public shouldTakeProfit(currentPrice: number, entryPrice: number): boolean {
    const profitPercentage = (currentPrice - entryPrice) / entryPrice;
    return this.config.takeProfitLevels.some(level => profitPercentage >= level);
  }
  
  public shouldStopLoss(currentPrice: number, entryPrice: number): boolean {
    const lossPercentage = (currentPrice - entryPrice) / entryPrice;
    return this.config.stopLossLevels.some(level => lossPercentage <= level);
  }
} 