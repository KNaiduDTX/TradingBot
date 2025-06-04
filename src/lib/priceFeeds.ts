import { Connection } from '@solana/web3.js';
import axios from 'axios';
import { Logger } from './logger';
import { getTokenPrice } from './marketData';
import { getPythFeedIdForMint } from './pythMintMapping';

export interface PriceFeedData {
  price: number;
  source: 'jupiter' | 'pyth' | 'switchboard';
  timestamp: number;
  confidence: number;
}

/**
 * PriceFeedManager provides price data for tokens using Jupiter and Pyth HTTP API as fallback, with caching and robust error handling.
 */
export class PriceFeedManager {
  private logger: Logger;
  private connection: Connection;
  private readonly PRICE_CACHE_TTL = 60000; // 1 minute
  private priceCache: Map<string, PriceFeedData> = new Map();
  private readonly PYTH_HTTP_URL = 'https://hermes.pyth.network/v2/price_feed'; // Official Pyth HTTP endpoint

  /**
   * Create a new PriceFeedManager instance.
   * @param connection Solana connection (not used for HTTP fallback, but kept for interface compatibility)
   */
  constructor(connection: Connection) {
    this.logger = new Logger('PriceFeedManager');
    this.connection = connection;
  }

  /**
   * Get price data for a token mint, with fallback and caching.
   * @param mint Token mint address (Solana)
   * @returns PriceFeedData
   */
  async getPriceData(mint: string): Promise<PriceFeedData> {
    const cached = this.priceCache.get(mint);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
      return cached;
    }
    try {
      const jupiterPrice = await getTokenPrice(mint);
      const data: PriceFeedData = {
        price: jupiterPrice,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };
      this.priceCache.set(mint, data);
      return data;
    } catch (error) {
      this.logger.warn('Jupiter price feed failed, trying Pyth HTTP fallback', {
        error: error instanceof Error ? error : new Error(String(error)),
        stack: error instanceof Error ? error.stack : undefined,
        mint
      });
      try {
        const pythPrice = await this.getPythPriceHttp(mint);
        const data: PriceFeedData = {
          price: pythPrice.price,
          source: 'pyth',
          timestamp: Date.now(),
          confidence: pythPrice.confidence
        };
        this.priceCache.set(mint, data);
        return data;
      } catch (pythError) {
        this.logger.error('All price feeds failed', {
          error: pythError instanceof Error ? pythError : new Error(String(pythError)),
          stack: pythError instanceof Error ? pythError.stack : undefined,
          mint
        });
        throw pythError instanceof Error ? pythError : new Error(String(pythError));
      }
    }
  }

  /**
   * Get price from Pyth HTTP API for a token mint.
   * @param mint Token mint address (Solana)
   * @returns Price and confidence
   * @throws Error if mapping or HTTP request fails
   */
  private async getPythPriceHttp(mint: string): Promise<{ price: number; confidence: number }> {
    try {
      const pythFeedId = await getPythFeedIdForMint(mint);
      if (!pythFeedId) {
        throw new Error(`No Pyth price feed mapping for mint: ${mint}`);
      }
      const url = `${this.PYTH_HTTP_URL}/${pythFeedId}`;
      const response = await axios.get(url);
      if (!response.data || !response.data.price) {
        throw new Error('No price data in Pyth HTTP response');
      }
      return {
        price: response.data.price.price,
        confidence: response.data.price.confidence_interval
      };
    } catch (error) {
      this.logger.error('Error fetching Pyth HTTP price', {
        error: error instanceof Error ? error : new Error(String(error)),
        stack: error instanceof Error ? error.stack : undefined,
        mint
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Clear the price cache.
   */
  clearCache(): void {
    this.priceCache.clear();
  }
} 