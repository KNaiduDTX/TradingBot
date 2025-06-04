import { Connection, PublicKey } from '@solana/web3.js';
import { PythClient } from '@pythnetwork/client';
import { Logger } from './logger';
import { getTokenPrice } from './marketData';

export interface PriceFeedData {
  price: number;
  source: 'jupiter' | 'pyth' | 'switchboard';
  timestamp: number;
  confidence: number;
}

export class PriceFeedManager {
  private logger: Logger;
  private connection: Connection;
  private pythClient: PythClient;
  private readonly PRICE_CACHE_TTL = 60000; // 1 minute
  private priceCache: Map<string, PriceFeedData> = new Map();

  constructor(connection: Connection) {
    this.logger = new Logger('PriceFeedManager');
    this.connection = connection;
    this.pythClient = new PythClient(this.connection);
  }

  /**
   * Get price data with fallback to multiple sources
   */
  async getPriceData(mint: string): Promise<PriceFeedData> {
    // Check cache first
    const cached = this.priceCache.get(mint);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
      return cached;
    }

    try {
      // Try Jupiter first
      const jupiterPrice = await getTokenPrice(mint);
      const data: PriceFeedData = {
        price: jupiterPrice,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };
      
      // Cache the result
      this.priceCache.set(mint, data);
      return data;
    } catch (error) {
      this.logger.warn('Jupiter price feed failed, trying Pyth fallback', {
        error: error instanceof Error ? error : new Error(String(error)),
        mint
      });

      try {
        // Try Pyth fallback
        const pythPrice = await this.getPythPrice(mint);
        const data: PriceFeedData = {
          price: pythPrice.price,
          source: 'pyth',
          timestamp: Date.now(),
          confidence: pythPrice.confidence
        };
        
        // Cache the result
        this.priceCache.set(mint, data);
        return data;
      } catch (error) {
        this.logger.error('All price feeds failed', {
          error: error instanceof Error ? error : new Error(String(error)),
          mint
        });
        throw error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  /**
   * Get price from Pyth network
   */
  private async getPythPrice(mint: string): Promise<{ price: number; confidence: number }> {
    try {
      // Get Pyth price account for the token
      const priceAccount = await this.pythClient.getPriceAccount(new PublicKey(mint));
      if (!priceAccount) {
        throw new Error('Pyth price account not found');
      }

      return {
        price: priceAccount.getPriceNoOlderThan(60), // Price no older than 60 seconds
        confidence: priceAccount.getConfidenceNoOlderThan(60)
      };
    } catch (error) {
      this.logger.error('Error fetching Pyth price', {
        error: error instanceof Error ? error : new Error(String(error)),
        mint
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.priceCache.clear();
  }
} 