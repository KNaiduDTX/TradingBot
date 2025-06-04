import { Connection, PublicKey } from '@solana/web3.js';
import { Logger } from '../lib/logger';
import { TokenInfo, MarketData } from '../types';
import axios from 'axios';

interface HeliusTokenLaunch {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  timestamp: number;
  metadata?: {
    description?: string;
    image?: string;
    social?: {
      twitter?: string;
      telegram?: string;
      website?: string;
    };
  };
}

export class TokenDetector {
  private connection: Connection;
  private logger: Logger;
  private heliusApiKey: string;
  private readonly MEMECOIN_KEYWORDS = ['doge', 'pepe', 'shib', 'inu', 'moon', 'elon', 'cat', 'baby'];
  private readonly MIN_LIQUIDITY_USD = 10000; // $10k minimum liquidity
  private readonly MIN_HOLDERS = 100;

  constructor(connection: Connection) {
    this.connection = connection;
    this.logger = new Logger('TokenDetector');
    this.heliusApiKey = process.env.HELIUS_API_KEY || '';
    
    if (!this.heliusApiKey) {
      this.logger.warn('Helius API key not found. Token detection may be limited.');
    }
  }

  /**
   * Detects new memecoin tokens on Solana using Helius API
   * @returns Promise<TokenInfo[]> Array of detected tokens
   */
  async detectNewTokens(): Promise<TokenInfo[]> {
    try {
      this.logger.info('Scanning for new tokens...');

      // Get recent token launches from Helius
      const recentTokens = await this.getRecentTokenLaunches();
      
      // Filter and validate memecoin candidates
      const memecoinCandidates = await Promise.all(
        recentTokens.map(async (token) => {
          const isValid = await this.validateMemecoin(new PublicKey(token.mint));
          if (isValid) {
            return this.convertToTokenInfo(token);
          }
          return null;
        })
      );

      const validTokens = memecoinCandidates.filter((token): token is TokenInfo => token !== null);
      
      this.logger.info(`Found ${validTokens.length} potential memecoin tokens`, {
        totalScanned: recentTokens.length
      });

      return validTokens;
    } catch (error) {
      this.logger.error('Error detecting tokens:', { error });
      throw error;
    }
  }

  /**
   * Fetches recent token launches from Helius API
   */
  private async getRecentTokenLaunches(): Promise<HeliusTokenLaunch[]> {
    try {
      const response = await axios.get('https://api.helius.xyz/v0/tokens/launches', {
        headers: {
          'Authorization': `Bearer ${this.heliusApiKey}`
        },
        params: {
          limit: 100,
          // Filter for last 24 hours
          startTime: Date.now() - 24 * 60 * 60 * 1000
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error fetching token launches from Helius:', { error });
      throw error;
    }
  }

  /**
   * Validates if a token is a potential memecoin
   * @param tokenAddress PublicKey of the token
   * @returns Promise<boolean> Whether the token is a memecoin
   */
  async validateMemecoin(tokenAddress: PublicKey): Promise<boolean> {
    try {
      // Get token metadata and market data
      const [metadata, marketData] = await Promise.all([
        this.getTokenMetadata(tokenAddress),
        this.getMarketData(tokenAddress)
      ]);

      // Check if token name/symbol contains memecoin keywords
      const nameLower = metadata.name.toLowerCase();
      const isMemecoinName = this.MEMECOIN_KEYWORDS.some(keyword => 
        nameLower.includes(keyword)
      );

      // Validate liquidity and holders
      const hasEnoughLiquidity = (marketData.liquidityUSD || 0) >= this.MIN_LIQUIDITY_USD;
      const hasEnoughHolders = (metadata.holders || 0) >= this.MIN_HOLDERS;

      // Calculate social score
      const socialScore = this.calculateSocialScore(metadata);

      const isValid = isMemecoinName && hasEnoughLiquidity && hasEnoughHolders && socialScore > 0.5;

      this.logger.debug('Memecoin validation result', {
        tokenMint: tokenAddress.toString(),
        isMemecoinName,
        hasEnoughLiquidity,
        hasEnoughHolders,
        socialScore,
        isValid
      });

      return isValid;
    } catch (error) {
      this.logger.error('Error validating memecoin:', { 
        error,
        tokenMint: tokenAddress.toString()
      });
      return false;
    }
  }

  /**
   * Gets token metadata from on-chain data
   */
  private async getTokenMetadata(tokenAddress: PublicKey): Promise<TokenInfo> {
    // TODO: Implement metadata fetching from on-chain data
    // This would involve fetching the token's metadata account
    // and parsing the data structure
    return {} as TokenInfo;
  }

  /**
   * Gets market data for a token
   */
  private async getMarketData(tokenAddress: PublicKey): Promise<MarketData> {
    // TODO: Implement market data fetching
    // This would involve querying DEX aggregators or price feeds
    return {} as MarketData;
  }

  /**
   * Calculates a social score based on token metadata
   */
  private calculateSocialScore(metadata: TokenInfo): number {
    let score = 0;
    
    if (metadata.metadata?.socialLinks) {
      if (metadata.metadata.socialLinks.twitter) score += 0.3;
      if (metadata.metadata.socialLinks.telegram) score += 0.3;
      if (metadata.metadata.socialLinks.website) score += 0.2;
    }

    if (metadata.metadata?.description) score += 0.2;

    return score;
  }

  /**
   * Converts Helius token data to TokenInfo format
   */
  private convertToTokenInfo(token: HeliusTokenLaunch): TokenInfo {
    return {
      mint: new PublicKey(token.mint),
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      supply: parseInt(token.supply),
      createdAt: new Date(token.timestamp),
      metadata: token.metadata ? {
        description: token.metadata.description,
        image: token.metadata.image,
        socialLinks: token.metadata.social
      } : undefined
    };
  }
} 