import { PublicKey } from '@solana/web3.js';
import config from '../../configs/config';
import logger from '../../configs/logger';

export class SecurityManager {
  private static instance: SecurityManager;
  private scamWallets: Set<string>;

  private constructor() {
    this.scamWallets = new Set(config.scamWallets);
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
    if (tx.amount > config.maxPositionSize) {
      return {
        isValid: false,
        reason: `Amount ${tx.amount} exceeds maximum position size ${config.maxPositionSize}`,
      };
    }

    // Validate slippage
    if (tx.slippage > config.maxSlippage) {
      return {
        isValid: false,
        reason: `Slippage ${tx.slippage} exceeds maximum allowed ${config.maxSlippage}`,
      };
    }

    // Validate total value
    const totalValue = tx.amount * tx.price;
    if (totalValue > config.maxPositionSize) {
      return {
        isValid: false,
        reason: `Total value ${totalValue} exceeds maximum position size ${config.maxPositionSize}`,
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
    if (token.liquidity < config.minLiquidity) {
      return {
        isValid: false,
        reason: `Liquidity ${token.liquidity} below minimum required ${config.minLiquidity}`,
      };
    }

    // Validate holders if available
    if (token.holders !== undefined && token.holders < config.minHolders) {
      return {
        isValid: false,
        reason: `Number of holders ${token.holders} below minimum required ${config.minHolders}`,
      };
    }

    return { isValid: true };
  }

  public updateScamWallets(wallets: string[]): void {
    this.scamWallets = new Set(wallets);
    logger.info('Updated scam wallets list', { count: wallets.length });
  }
} 