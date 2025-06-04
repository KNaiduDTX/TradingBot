import winston from 'winston';
import TelegramBot from 'node-telegram-bot-api';

export interface LogMetadata {
  tokenMint?: string;
  tradeId?: string;
  pnl?: number;
  error?: Error;
  [key: string]: any;
}

export class Logger {
  private logger: winston.Logger;
  private telegramBot?: TelegramBot;

  constructor(context: string) {
    // Initialize Telegram bot if token is provided
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      this.telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        context,
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...metadata }) => {
              return `${timestamp} [${level}]: ${message} ${
                Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''
              }`;
            })
          ),
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
      ],
    });
  }

  private async sendTelegramAlert(level: string, message: string, metadata?: LogMetadata): Promise<void> {
    if (!this.telegramBot || !process.env.TELEGRAM_CHAT_ID) return;

    const alertMessage = `🚨 [${level.toUpperCase()}] ${message}\n${
      metadata ? JSON.stringify(metadata, null, 2) : ''
    }`;

    try {
      await this.telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, alertMessage);
    } catch (error) {
      console.error('Failed to send Telegram alert:', error);
    }
  }

  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, metadata);
  }

  error(message: string, metadata?: LogMetadata): void {
    const errorMetadata = {
      ...metadata,
      error: metadata?.error?.message || metadata?.error,
      stack: metadata?.error?.stack
    };
    
    this.logger.error(message, errorMetadata);
    
    // Send critical errors to Telegram
    if (metadata?.error || message.toLowerCase().includes('error')) {
      this.sendTelegramAlert('error', message, errorMetadata);
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, metadata);
    
    // Send warnings to Telegram
    this.sendTelegramAlert('warning', message, metadata);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, metadata);
  }

  // New method for trade-specific logging
  trade(message: string, metadata: LogMetadata): void {
    const tradeMetadata = {
      ...metadata,
      type: 'trade',
      timestamp: new Date().toISOString()
    };
    
    this.logger.info(message, tradeMetadata);
    
    // Send trade notifications to Telegram
    if (process.env.TELEGRAM_NOTIFY_TRADES === 'true') {
      this.sendTelegramAlert('trade', message, tradeMetadata);
    }
  }

  // New method for performance metrics
  performance(metrics: LogMetadata): void {
    this.logger.info('Performance Update', {
      ...metrics,
      type: 'performance',
      timestamp: new Date().toISOString()
    });
  }
} 