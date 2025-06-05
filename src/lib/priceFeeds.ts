import { Connection } from '@solana/web3.js';
import { Logger } from './logger';
import BirdeyeProvider from './birdeye';
import { JupiterProvider, PythProvider, PriceDataProvider } from './priceDataProvider';
import { PriceFeedData } from '../types/index';

/**
 * PriceFeedManager provides price data for tokens using unified provider abstraction.
 */
export class PriceFeedManager {
  private logger: Logger;
  private connection: Connection;
  private readonly PRICE_CACHE_TTL = 60000; // 1 minute
  private priceCache: Map<string, PriceFeedData> = new Map();
  private providers: PriceDataProvider[];

  constructor(connection: Connection) {
    this.logger = new Logger('PriceFeedManager');
    this.connection = connection;
    this.providers = [new BirdeyeProvider(), new JupiterProvider(), new PythProvider()];
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
    for (const provider of this.providers) {
      try {
        const price = await provider.getCurrentPrice(mint);
        if (price && typeof price.price === 'number') {
          this.priceCache.set(mint, price);
          return price;
        }
      } catch (error) {
        this.logger.warn(`${provider.name} price feed failed, trying next provider`, {
          error: error instanceof Error ? error : new Error(String(error)),
          mint
        });
      }
    }
    this.logger.error('All price feeds failed', { mint });
    throw new Error(`All price feeds failed for mint: ${mint}`);
  }

  /**
   * Clear the price cache.
   */
  clearCache(): void {
    this.priceCache.clear();
  }
} 