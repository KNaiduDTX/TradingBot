import { PublicKey } from '@solana/web3.js';
import path from 'path';

export interface BotConfig {
  // Network Configuration
  rpcEndpoint: string;
  wsEndpoint: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  
  // Trading Parameters
  maxPositionSize: number;
  minLiquidity: number;
  maxSlippage: number;
  minHolders: number;
  
  // Risk Management
  takeProfitThreshold: number;
  stopLossThreshold: number;
  maxHoldingTime: number;
  maxDrawdown: number;
  
  // Monitoring
  metricsPort: number;
  prometheusEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Database
  dbPath: string;
  
  // Security
  scamWallets: string[];
  
  // API Keys
  pythApiKey?: string;
  switchboardApiKey?: string;
  heliusApiKey?: string;
  
  // Model Settings
  modelPath: string;
  confidenceThreshold: number;
}

const config: BotConfig = {
  // Network Configuration
  rpcEndpoint: process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  wsEndpoint: process.env.WS_ENDPOINT || 'wss://api.mainnet-beta.solana.com',
  commitment: (process.env.COMMITMENT as BotConfig['commitment']) || 'confirmed',
  
  // Trading Parameters
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '1.0'),
  minLiquidity: parseFloat(process.env.MIN_LIQUIDITY || '10000'),
  maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.015'),
  minHolders: parseInt(process.env.MIN_HOLDERS || '100'),
  
  // Risk Management
  takeProfitThreshold: parseFloat(process.env.TAKE_PROFIT_THRESHOLD || '0.15'),
  stopLossThreshold: parseFloat(process.env.STOP_LOSS_THRESHOLD || '-0.10'),
  maxHoldingTime: parseInt(process.env.MAX_HOLDING_TIME || '3600000'),
  maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.1'),
  
  // Monitoring
  metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
  prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
  logLevel: (process.env.LOG_LEVEL as BotConfig['logLevel']) || 'info',
  
  // Database
  dbPath: process.env.DB_PATH || path.join(__dirname, '../data/trading.db'),
  
  // Security
  scamWallets: process.env.SCAM_WALLETS ? process.env.SCAM_WALLETS.split(',') : [],
  
  // API Keys
  pythApiKey: process.env.PYTH_API_KEY,
  switchboardApiKey: process.env.SWITCHBOARD_API_KEY,
  heliusApiKey: process.env.HELIUS_API_KEY,
  
  // Model Settings
  modelPath: process.env.MODEL_PATH || path.join(__dirname, '../models/solana_bot_model.onnx'),
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.67')
};

export default config; 