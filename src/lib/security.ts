import { PublicKey } from '@solana/web3.js';
import { config } from '../lib/config';
import logger from '../../configs/logger';

export class SecurityManager {
  private static instance: SecurityManager;
  private scamWallets: Set<string>;

  private constructor() {
    const cfg = config.getConfig();
    this.scamWallets = new Set(cfg.scamWallets);
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  public validateWallet(wallet: PublicKey): { isValid: boolean; reason?: string } {
    const walletStr = wallet.toString();
    
    if (this.scamWallets.has(walletStr)) {
      logger.warn('Scam wallet detected', { wallet: walletStr });
      return { isValid: false, reason: 'Known scam wallet' };
    }

    return { isValid: true };
  }

  public validateTransaction(tx: {
    amount: number;
    price: number;
    slippage: number;
  }): { isValid: boolean; reason?: string } {
    // Validate amount
    const cfg = config.getConfig();
    if (tx.amount > cfg.maxPositionSize) {
      return {
        isValid: false,
        reason: `Amount ${tx.amount} exceeds maximum position size ${cfg.maxPositionSize}`,
      };
    }

    // Validate slippage
    if (tx.slippage > cfg.maxSlippageBps / 10000) {
      return {
        isValid: false,
        reason: `Slippage ${tx.slippage} exceeds maximum allowed ${cfg.maxSlippageBps / 10000}`,
      };
    }

    // Validate total value
    const totalValue = tx.amount * tx.price;
    if (totalValue > cfg.maxPositionSize) {
      return {
        isValid: false,
        reason: `Total value ${totalValue} exceeds maximum position size ${cfg.maxPositionSize}`,
      };
    }

    return { isValid: true };
  }

  public validateToken(token: {
    mint: PublicKey;
    liquidity: number;
    holders?: number;
  }): { isValid: boolean; reason?: string } {
    // Validate liquidity
    const cfg = config.getConfig();
    if (token.liquidity < cfg.minLiquidityUSD) {
      return {
        isValid: false,
        reason: `Liquidity ${token.liquidity} below minimum required ${cfg.minLiquidityUSD}`,
      };
    }

    // Validate holders if available
    if (token.holders !== undefined && token.holders < cfg.minHolders) {
      return {
        isValid: false,
        reason: `Number of holders ${token.holders} below minimum required ${cfg.minHolders}`,
      };
    }

    return { isValid: true };
  }

  public updateScamWallets(wallets: string[]): void {
    const cfg = config.getConfig();
    this.scamWallets = new Set(wallets);
    logger.info('Updated scam wallets list', { count: wallets.length });
  }
} 