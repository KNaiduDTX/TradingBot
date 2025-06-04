import winston from 'winston';
import TelegramBot from 'node-telegram-bot-api';
import { config } from './config';

export interface LogMetadata {
  tokenMint?: string;
  tradeId?: string;
  pnl?: number;
  error?: Error;
  [key: string]: any;
}

/**
 * Logger provides structured logging, error reporting, and optional Telegram alerts.
 */
export class Logger {
  private logger: winston.Logger;
  private telegramBot?: TelegramBot;

  /**
   * Create a new Logger instance for a given context.
   * @param context The context or module name for the logger.
   */
  constructor(context: string) {
    // Initialize Telegram bot if token is provided
    const cfg = config.getConfig();
    if (cfg.telegramBotToken && cfg.telegramChatId) {
      this.telegramBot = new TelegramBot(cfg.telegramBotToken, { polling: false });
    }
    this.logger = winston.createLogger({
      level: cfg.logLevel || 'info',
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

  /**
   * Send a Telegram alert for a given log level and message.
   */
  private async sendTelegramAlert(level: string, message: string, metadata?: LogMetadata): Promise<void> {
    const cfg = config.getConfig();
    if (!this.telegramBot || !cfg.telegramChatId) return;
    const alertMessage = `🚨 [${level.toUpperCase()}] ${message}\n${
      metadata ? JSON.stringify(metadata, null, 2) : ''
    }`;
    try {
      await this.telegramBot.sendMessage(cfg.telegramChatId, alertMessage);
    } catch (error) {
      // Only log to console to avoid recursion
      // eslint-disable-next-line no-console
      console.error('Failed to send Telegram alert:', error);
    }
  }

  /**
   * Log an info-level message.
   */
  info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, metadata);
  }

  /**
   * Log an error-level message, including stack trace and optional Telegram alert.
   */
  error(message: string, metadata?: LogMetadata): void {
    const errorMetadata = {
      ...metadata,
      error: metadata?.error instanceof Error ? metadata.error : (metadata?.error ? new Error(String(metadata.error)) : undefined),
      stack: metadata?.error instanceof Error ? metadata.error.stack : metadata?.stack
    };
    this.logger.error(message, errorMetadata);
    if (metadata?.error || message.toLowerCase().includes('error')) {
      this.sendTelegramAlert('error', message, errorMetadata);
    }
  }

  /**
   * Log a warning-level message, including optional Telegram alert.
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, metadata);
    this.sendTelegramAlert('warning', message, metadata);
  }

  /**
   * Log a debug-level message.
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, metadata);
  }

  /**
   * Log a trade-specific info message, with optional Telegram alert.
   */
  trade(message: string, metadata: LogMetadata): void {
    const tradeMetadata = {
      ...metadata,
      type: 'trade',
      timestamp: new Date().toISOString()
    };
    this.logger.info(message, tradeMetadata);
    if (config.getConfig().telegramNotifyTrades) {
      this.sendTelegramAlert('trade', message, tradeMetadata);
    }
  }

  /**
   * Log a performance metrics update.
   */
  performance(metrics: LogMetadata): void {
    this.logger.info('Performance Update', {
      ...metrics,
      type: 'performance',
      timestamp: new Date().toISOString()
    });
  }
} 