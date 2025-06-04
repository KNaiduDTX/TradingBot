import { TokenInfo, TradeResult, PerformanceMetrics } from './index';

export interface TradeRecord {
  id: number;
  token_mint: string;
  symbol: string;
  name: string;
  amount: number;
  price: number;
  action: 'BUY' | 'SELL';
  timestamp: string;
  exit_timestamp?: string;
  unrealized_pnl?: number;
  realized_pnl?: number;
  slippage?: number;
  gas_fees?: number;
  dex_fees?: number;
  total_fees?: number;
  tx_hash?: string;
}

export interface LogRecord {
  id: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: string;
  timestamp: string;
}

export interface TokenRecord {
  id: number;
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  holders?: number;
  social_score?: number;
  created_at?: string;
  last_updated: string;
}

export interface PerformanceRecord {
  id: number;
  total_pnl: number;
  win_rate: number;
  avg_trade_duration: number;
  best_trade_id?: number;
  worst_trade_id?: number;
  timestamp: string;
}

export interface DatabaseSchema {
  trades: TradeRecord;
  logs: LogRecord;
  tokens: TokenRecord;
  performance: PerformanceRecord;
}

export type TableName = keyof DatabaseSchema;

export interface DatabaseQuery {
  table: TableName;
  where?: Record<string, any>;
  orderBy?: { column: string; direction: 'ASC' | 'DESC' };
  limit?: number;
  offset?: number;
}

export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
} 