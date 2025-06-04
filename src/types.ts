import { PublicKey } from '@solana/web3.js';

// DEPRECATED: Use types from src/types/index.ts instead
// import { TradeSignal, TradeResult, PerformanceMetrics } from './types/index';

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