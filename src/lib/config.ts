import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface BotConfig {
  // Network
  rpcEndpoint: string;
  wsEndpoint: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  
  // API Keys
  heliusApiKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  
  // Wallet
  walletPublicKey: PublicKey;
  walletPrivateKey: string;
  
  // Trading Parameters
  maxPositionSize: number;
  minLiquidityUSD: number;
  maxSlippageBps: number;
  minHolders: number;
  
  // Risk Management
  maxDrawdown: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  
  // Monitoring
  telegramNotifyTrades: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Model Settings
  modelPath: string;
  confidenceThreshold: number;
  
  // Database
  dbPath: string;
  scamWallets: string[];
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: BotConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): BotConfig {
    // Validate required environment variables
    const requiredEnvVars = [
      'SOLANA_RPC_ENDPOINT',
      'SOLANA_WS_ENDPOINT',
      'HELIUS_API_KEY',
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_CHAT_ID',
      'WALLET_PUBLIC_KEY',
      'WALLET_PRIVATE_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    return {
      // Network
      rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT!,
      wsEndpoint: process.env.SOLANA_WS_ENDPOINT!,
      commitment: (process.env.SOLANA_COMMITMENT as BotConfig['commitment']) || 'confirmed',
      
      // API Keys
      heliusApiKey: process.env.HELIUS_API_KEY!,
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN!,
      telegramChatId: process.env.TELEGRAM_CHAT_ID!,
      
      // Wallet
      walletPublicKey: new PublicKey(process.env.WALLET_PUBLIC_KEY!),
      walletPrivateKey: process.env.WALLET_PRIVATE_KEY!,
      
      // Trading Parameters
      maxPositionSize: Number(process.env.MAX_POSITION_SIZE) || 1.0,
      minLiquidityUSD: Number(process.env.MIN_LIQUIDITY_USD) || 10000,
      maxSlippageBps: Number(process.env.MAX_SLIPPAGE_BPS) || 150,
      minHolders: Number(process.env.MIN_HOLDERS) || 100,
      
      // Risk Management
      maxDrawdown: Number(process.env.MAX_DRAWDOWN) || 0.1,
      stopLossPercentage: Number(process.env.STOP_LOSS_PERCENTAGE) || 0.05,
      takeProfitPercentage: Number(process.env.TAKE_PROFIT_PERCENTAGE) || 0.1,
      
      // Monitoring
      telegramNotifyTrades: process.env.TELEGRAM_NOTIFY_TRADES === 'true',
      logLevel: (process.env.LOG_LEVEL as BotConfig['logLevel']) || 'info',
      
      // Model Settings
      modelPath: process.env.MODEL_PATH || path.join(__dirname, '../../models/solana_bot_model.onnx'),
      confidenceThreshold: Number(process.env.CONFIDENCE_THRESHOLD) || 0.67,
      
      // Database
      dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/trades.db'),
      scamWallets: process.env.SCAM_WALLETS ? process.env.SCAM_WALLETS.split(',') : [],
    };
  }

  public getConfig(): BotConfig {
    return this.config;
  }

  public getConnection(): Connection {
    return new Connection(this.config.rpcEndpoint, this.config.commitment);
  }
}

export const config = ConfigManager.getInstance(); 