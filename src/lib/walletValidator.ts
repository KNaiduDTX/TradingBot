import { Connection, PublicKey } from '@solana/web3.js';
import { Logger } from './logger';
import axios from 'axios';

export interface WalletRisk {
  isScam: boolean;
  riskScore: number;
  reasons: string[];
}

export class WalletValidator {
  private logger: Logger;
  private connection: Connection;
  private scamList: Set<string>;
  private readonly SCAM_LIST_URL = 'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json';
  private readonly MIN_ACCOUNT_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(connection: Connection) {
    this.logger = new Logger('WalletValidator');
    this.connection = connection;
    this.scamList = new Set();
    this.loadScamList();
  }

  /**
   * Load scam list from remote source
   */
  private async loadScamList(): Promise<void> {
    try {
      const response = await axios.get(this.SCAM_LIST_URL);
      const tokens = response.data.tokens;
      
      // Add known scam tokens to the list
      tokens.forEach((token: any) => {
        if (token.tags?.includes('scam')) {
          this.scamList.add(token.address);
        }
      });

      this.logger.info('Scam list loaded', { count: this.scamList.size });
    } catch (error) {
      this.logger.error('Error loading scam list', {
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Validate a wallet address
   */
  async validateWallet(walletAddress: string): Promise<WalletRisk> {
    try {
      const reasons: string[] = [];
      let riskScore = 0;

      // Check if wallet is in scam list
      if (this.scamList.has(walletAddress)) {
        reasons.push('Wallet is in known scam list');
        riskScore += 0.5;
      }

      // Check account age
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(walletAddress));
      if (accountInfo) {
        const accountAge = Date.now() - accountInfo.owner.toNumber();
        if (accountAge < this.MIN_ACCOUNT_AGE) {
          reasons.push('Account is too new');
          riskScore += 0.3;
        }
      }

      // Check for suspicious patterns
      const suspiciousPatterns = await this.checkSuspiciousPatterns(walletAddress);
      reasons.push(...suspiciousPatterns.reasons);
      riskScore += suspiciousPatterns.riskScore;

      return {
        isScam: riskScore >= 0.5,
        riskScore: Math.min(1, riskScore),
        reasons
      };
    } catch (error) {
      this.logger.error('Error validating wallet', {
        error: error instanceof Error ? error : new Error(String(error)),
        walletAddress
      });
      return {
        isScam: true,
        riskScore: 1,
        reasons: ['Error during validation']
      };
    }
  }

  /**
   * Check for suspicious patterns in wallet activity
   */
  private async checkSuspiciousPatterns(walletAddress: string): Promise<{ reasons: string[]; riskScore: number }> {
    const reasons: string[] = [];
    let riskScore = 0;

    try {
      // Get recent transactions
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(walletAddress),
        { limit: 10 }
      );

      // Check for rapid transactions
      if (signatures.length > 0) {
        const timeSpan = signatures[0].blockTime! - signatures[signatures.length - 1].blockTime!;
        if (timeSpan < 60) { // Less than 1 minute
          reasons.push('Suspicious: Rapid transaction pattern');
          riskScore += 0.2;
        }
      }

      // Check for multiple failed transactions
      const failedTransactions = signatures.filter(sig => sig.err !== null).length;
      if (failedTransactions > 3) {
        reasons.push('Suspicious: Multiple failed transactions');
        riskScore += 0.2;
      }

    } catch (error) {
      this.logger.error('Error checking suspicious patterns', {
        error: error instanceof Error ? error : new Error(String(error)),
        walletAddress
      });
    }

    return { reasons, riskScore };
  }

  /**
   * Add a wallet to the scam list
   */
  addToScamList(walletAddress: string): void {
    this.scamList.add(walletAddress);
    this.logger.info('Wallet added to scam list', { walletAddress });
  }
} 