import { PriceFeedData } from '../types/index';
import axios from 'axios';
import { getPythFeedIdForMint } from './pythMintMapping';

/**
 * Token metadata structure
 */
export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
}

/**
 * Liquidity data structure
 */
export interface LiquidityData {
  tvl: number;
  volume24h: number;
}

/**
 * Unified interface for price, metadata, and liquidity providers
 */
export interface PriceDataProvider {
  /**
   * Fetch the current price for a given token mint
   */
  getCurrentPrice(mint: string): Promise<PriceFeedData | undefined>;

  /**
   * Fetch historical price for a given token mint and timestamp (optional)
   */
  getHistoricalPrice?(mint: string, timestamp: number): Promise<PriceFeedData | undefined>;

  /**
   * Fetch token metadata
   */
  getTokenMetadata(mint: string): Promise<TokenMetadata | undefined>;

  /**
   * Fetch liquidity data for a token
   */
  getLiquidity(mint: string): Promise<LiquidityData | undefined>;

  /**
   * Provider name (for logging/selection)
   */
  readonly name: string;
}

/**
 * Birdeye provider scaffold
 */
export class BirdeyeProvider implements PriceDataProvider {
  readonly name = 'birdeye';
  async getCurrentPrice(mint: string): Promise<PriceFeedData | undefined> { throw new Error('Not implemented'); }
  async getTokenMetadata(mint: string): Promise<TokenMetadata | undefined> { throw new Error('Not implemented'); }
  async getLiquidity(mint: string): Promise<LiquidityData | undefined> { throw new Error('Not implemented'); }
}

/**
 * JupiterProvider implements PriceDataProvider using Jupiter's public API.
 */
export class JupiterProvider implements PriceDataProvider {
  readonly name = 'jupiter';
  private readonly JUPITER_API_URL = 'https://price.jup.ag/v4/price';

  /**
   * Fetch current price from Jupiter public API.
   */
  async getCurrentPrice(mint: string): Promise<PriceFeedData | undefined> {
    try {
      const url = `${this.JUPITER_API_URL}?ids=${mint}`;
      const response = await axios.get(url);
      const price = response.data?.data?.[mint]?.price;
      if (typeof price === 'number') {
        return {
          price,
          source: 'jupiter',
          timestamp: Date.now(),
          confidence: 0.9
        };
      }
      return undefined;
    } catch (error) {
      throw new Error(`Jupiter price fetch failed for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Jupiter does not provide token metadata directly. Not implemented.
   */
  async getTokenMetadata(mint: string): Promise<TokenMetadata | undefined> {
    // Not implemented by Jupiter
    return undefined;
  }

  /**
   * Jupiter does not provide liquidity data directly. Not implemented.
   */
  async getLiquidity(mint: string): Promise<LiquidityData | undefined> {
    // Not implemented by Jupiter
    return undefined;
  }
}

/**
 * PythProvider implements PriceDataProvider using Pyth HTTP API.
 */
export class PythProvider implements PriceDataProvider {
  readonly name = 'pyth';
  private readonly PYTH_HTTP_URL = 'https://hermes.pyth.network/v2/price_feed';

  /**
   * Fetch current price from Pyth HTTP API using mint-to-feed mapping.
   */
  async getCurrentPrice(mint: string): Promise<PriceFeedData | undefined> {
    try {
      const pythFeedId = await getPythFeedIdForMint(mint);
      if (!pythFeedId) return undefined;
      const url = `${this.PYTH_HTTP_URL}/${pythFeedId}`;
      const response = await axios.get(url);
      if (!response.data || !response.data.price) return undefined;
      return {
        price: response.data.price.price,
        source: 'pyth',
        timestamp: Date.now(),
        confidence: response.data.price.confidence_interval
      };
    } catch (error) {
      throw new Error(`Pyth price fetch failed for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Pyth does not provide token metadata directly. Not implemented.
   */
  async getTokenMetadata(mint: string): Promise<TokenMetadata | undefined> {
    // Not implemented by Pyth
    return undefined;
  }

  /**
   * Pyth does not provide liquidity data directly. Not implemented.
   */
  async getLiquidity(mint: string): Promise<LiquidityData | undefined> {
    // Not implemented by Pyth
    return undefined;
  }
}

/**
 * ProviderManager manages multiple PriceDataProviders and provides unified access with fallback.
 */
export class ProviderManager implements PriceDataProvider {
  readonly name = 'providerManager';
  private providers: PriceDataProvider[];

  constructor(providers: PriceDataProvider[]) {
    this.providers = providers;
  }

  /**
   * Try each provider in order for current price, return first successful result.
   */
  async getCurrentPrice(mint: string): Promise<PriceFeedData | undefined> {
    for (const provider of this.providers) {
      try {
        const price = await provider.getCurrentPrice(mint);
        if (price && typeof price.price === 'number') {
          return price;
        }
      } catch (error) {
        // Continue to next provider
      }
    }
    return undefined;
  }

  /**
   * Try each provider in order for token metadata, return first successful result.
   */
  async getTokenMetadata(mint: string): Promise<TokenMetadata | undefined> {
    for (const provider of this.providers) {
      try {
        const meta = await provider.getTokenMetadata(mint);
        if (meta) return meta;
      } catch (error) {
        // Continue to next provider
      }
    }
    return undefined;
  }

  /**
   * Try each provider in order for liquidity, return first successful result.
   */
  async getLiquidity(mint: string): Promise<LiquidityData | undefined> {
    for (const provider of this.providers) {
      try {
        const liq = await provider.getLiquidity(mint);
        if (liq) return liq;
      } catch (error) {
        // Continue to next provider
      }
    }
    return undefined;
  }
} 