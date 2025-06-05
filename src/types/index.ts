import { PublicKey } from '@solana/web3.js';

export interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  holders?: number;
  socialScore?: number;
  createdAt?: Date;
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
  riskMetrics: RiskMetrics;
  predictionMetrics: PredictionMetrics;
}

export interface RiskMetrics {
  volatility: number;
  liquidityDepth: number;
  marketCap: number;
  priceFeedReliability: number;
  slippageEstimate: number;
  walletRisk: number;
  overallRisk: number;
}

export interface PredictionMetrics {
  expectedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface TradeResult {
  token: TokenInfo;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: string;
  exitTimestamp?: string;
  unrealizedPnL?: number;
  realizedPnL?: number;
  executionMetrics?: {
    slippage: number;
    gasFees: number;
    dexFees: number;
    totalFees: number;
  };
  error?: string;
}

export interface PerformanceMetrics {
  totalPnL: number;
  winRate: number;
  avgTradeDuration: number;
  bestTrade: TradeResult;
  worstTrade: TradeResult;
  recentTrades: TradeResult[];
}

export interface Position {
  id: string;
  token: TokenInfo;
  entryPrice: number;
  amount: number;
  entryTime: Date;
  stopLoss: number;
  takeProfit: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
}

export interface MarketData {
  price: number;
  volume24h: number;
  liquidityUSD: number;
  priceChange24h: number;
  lastUpdate: Date;
}

export interface WalletRisk {
  isScam: boolean;
  reasons: string[];
  riskScore: number;
}

export interface PriceFeedData {
  price: number;
  source: 'jupiter' | 'pyth' | 'switchboard' | 'birdeye';
  timestamp: number;
  confidence: number;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  slippage?: number;
  gasFees?: number;
  dexFees?: number;
  totalFees?: number;
} 