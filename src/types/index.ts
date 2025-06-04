import { PublicKey } from '@solana/web3.js';

export interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  createdAt: Date;
  metadata?: TokenMetadata;
  lpLocked?: boolean;
  liquidityUSD?: number;
  holders?: number;
  socialScore?: number;
}

export interface TokenMetadata {
  description?: string;
  image?: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
  twitterFollowers?: number;
  telegramMembers?: number;
  lastSocialUpdate?: Date;
}

export interface TradeSignal {
  token: TokenInfo;
  action: 'BUY' | 'SELL';
  confidence: number;
  timestamp: Date;
  price: number;
  volume: number;
  score: number;
  suggestedSize: number;
  riskMetrics: {
    volatility: number;
    liquidityDepth: number;
    marketCap: number;
  };
  predictionMetrics: {
    expectedReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
}

export interface TradeResult {
  token: TokenInfo;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: Date;
  txHash: string;
  pnl?: number;
  pnlPercentage?: number;
  fees?: {
    gas: number;
    dex: number;
    total: number;
  };
  executionMetrics: {
    slippage: number;
    priceImpact: number;
    executionTime: number;
  };
  positionId: string;
  entryPrice: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
  holdingTime?: number;
}

export interface PerformanceMetrics {
  totalPnL: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageReturn: number;
  volatility: number;
  totalTrades: number;
  profitableTrades: number;
  averageHoldingTime: number;
  bestTrade: TradeResult;
  worstTrade: TradeResult;
  recentTrades: TradeResult[];
}

export interface MarketData {
  price: number;
  volume24h: number;
  liquidityUSD: number;
  priceChange24h: number;
  lastUpdate: Date;
  orderBook?: {
    bids: [number, number][];
    asks: [number, number][];
  };
} 