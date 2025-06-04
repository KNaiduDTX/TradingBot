import { PublicKey } from '@solana/web3.js';

export interface RiskConfig {
  // Position Limits
  maxPositionSize: number;
  maxPositions: number;
  minLiquidityUSD: number;
  maxSlippageBps: number;
  
  // Risk Thresholds
  maxDrawdown: number;
  dailyLossLimit: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  
  // Time-based Controls
  maxHoldingTime: number;
  minTimeBetweenTrades: number;
  
  // Market Risk
  minMarketCap: number;
  minVolume24h: number;
  maxPriceImpact: number;
  
  // Circuit Breakers
  maxConsecutiveLosses: number;
  maxDailyTrades: number;
  emergencyStopThreshold: number;
}

export const defaultRiskConfig: RiskConfig = {
  // Position Limits
  maxPositionSize: 1.0, // SOL
  maxPositions: 5,
  minLiquidityUSD: 10000,
  maxSlippageBps: 150, // 1.5%
  
  // Risk Thresholds
  maxDrawdown: 0.1, // 10%
  dailyLossLimit: 0.05, // 5%
  stopLossPercentage: 0.05, // 5%
  takeProfitPercentage: 0.1, // 10%
  
  // Time-based Controls
  maxHoldingTime: 3600000, // 1 hour in milliseconds
  minTimeBetweenTrades: 300000, // 5 minutes in milliseconds
  
  // Market Risk
  minMarketCap: 100000, // $100k
  minVolume24h: 50000, // $50k
  maxPriceImpact: 0.02, // 2%
  
  // Circuit Breakers
  maxConsecutiveLosses: 3,
  maxDailyTrades: 20,
  emergencyStopThreshold: 0.15 // 15% loss triggers emergency stop
};

export class RiskManager {
  private config: RiskConfig;
  private consecutiveLosses: number = 0;
  private dailyTrades: number = 0;
  private dailyPnL: number = 0;
  private lastTradeTime: number = 0;

  constructor(config: Partial<RiskConfig> = {}) {
    this.config = { ...defaultRiskConfig, ...config };
  }

  public validateTrade(tokenMint: PublicKey, amount: number, price: number): boolean {
    // Check position limits
    if (amount > this.config.maxPositionSize) {
      return false;
    }

    // Check time between trades
    const now = Date.now();
    if (now - this.lastTradeTime < this.config.minTimeBetweenTrades) {
      return false;
    }

    // Check daily limits
    if (this.dailyTrades >= this.config.maxDailyTrades) {
      return false;
    }

    // Check drawdown
    if (Math.abs(this.dailyPnL) > this.config.dailyLossLimit) {
      return false;
    }

    return true;
  }

  public updateTradeMetrics(pnl: number): void {
    this.dailyTrades++;
    this.dailyPnL += pnl;
    
    if (pnl < 0) {
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }
  }

  public shouldEmergencyStop(): boolean {
    return (
      this.consecutiveLosses >= this.config.maxConsecutiveLosses ||
      Math.abs(this.dailyPnL) >= this.config.emergencyStopThreshold
    );
  }

  public resetDailyMetrics(): void {
    this.dailyTrades = 0;
    this.dailyPnL = 0;
    this.consecutiveLosses = 0;
  }
} 