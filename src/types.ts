import { PublicKey } from '@solana/web3.js';

export interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  createdAt: Date;
  metadata?: {
    description?: string;
    image?: string;
    external_url?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  lpLocked?: boolean;
  liquidityUSD?: number;
  holders?: number;
  socialScore?: number;
}

export interface TradeSignal {
  token: TokenInfo;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  confidence: number;
  timestamp: string;
  metadata?: {
    source: string;
    reason: string;
    riskScore: number;
  };
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
}

export interface PerformanceMetrics {
  totalPnL: number;
  winRate: number;
  avgTradeDuration: number;
  bestTrade: TradeResult;
  worstTrade: TradeResult;
  recentTrades: TradeResult[];
} 