import { PublicKey } from '@solana/web3.js';

export interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  createdAt: Date;
  metadata?: TokenMetadata;
}

export interface TokenMetadata {
  description?: string;
  image?: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
}

export interface TradeSignal {
  token: TokenInfo;
  action: 'BUY' | 'SELL';
  confidence: number;
  timestamp: Date;
  price: number;
  volume: number;
}

export interface TradeResult {
  token: TokenInfo;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  timestamp: Date;
  txHash: string;
  pnl?: number;
} 