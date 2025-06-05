import axios from 'axios';
import { PriceFeedData } from '../types/index';
import { PriceDataProvider, TokenMetadata, LiquidityData } from './priceDataProvider';

const BIRDEYE_API_KEY = 'e48289dad3b44355af6c4942538d7bac';
const BASE_URL = 'https://public-api.birdeye.so';
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Simple in-memory cache
const cache: Record<string, { value: any; expiry: number }> = {};

function getCache<T>(key: string): T | undefined {
  const entry = cache[key];
  if (entry && Date.now() < entry.expiry) {
    return entry.value as T;
  }
  return undefined;
}

function setCache(key: string, value: any) {
  cache[key] = { value, expiry: Date.now() + CACHE_TTL_MS };
}

function getHeaders() {
  return {
    'X-API-KEY': BIRDEYE_API_KEY,
    'accept': 'application/json',
  };
}

/**
 * BirdeyeProvider implements PriceDataProvider for price, metadata, and liquidity.
 */
export default class BirdeyeProvider implements PriceDataProvider {
  readonly name = 'birdeye';

  async getCurrentPrice(mint: string): Promise<PriceFeedData | undefined> {
    const cacheKey = `price:${mint}`;
    const cached = getCache<PriceFeedData>(cacheKey);
    if (cached) return cached;
    try {
      const url = `${BASE_URL}/public/price?address=${mint}`;
      const response = await axios.get(url, { headers: getHeaders() });
      if (response.data?.success && response.data.data) {
        const result: PriceFeedData = {
          price: response.data.data.value,
          source: 'birdeye',
          timestamp: Date.now(),
          confidence: 0.95
        };
        setCache(cacheKey, result);
        return result;
      }
      return undefined;
    } catch (error) {
      throw new Error(`Birdeye price fetch failed for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTokenMetadata(mint: string): Promise<TokenMetadata | undefined> {
    const cacheKey = `meta:${mint}`;
    const cached = getCache<TokenMetadata>(cacheKey);
    if (cached) return cached;
    try {
      const url = `${BASE_URL}/public/token/${mint}`;
      const response = await axios.get(url, { headers: getHeaders() });
      if (response.data?.success && response.data.data) {
        setCache(cacheKey, response.data.data);
        return response.data.data;
      }
      return undefined;
    } catch (error) {
      throw new Error(`Birdeye token metadata fetch failed for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getLiquidity(mint: string): Promise<LiquidityData | undefined> {
    const cacheKey = `liq:${mint}`;
    const cached = getCache<LiquidityData>(cacheKey);
    if (cached) return cached;
    try {
      const url = `${BASE_URL}/public/pool/list?address=${mint}`;
      const response = await axios.get(url, { headers: getHeaders() });
      if (response.data?.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
        let tvl = 0;
        let volume24h = 0;
        for (const pool of response.data.data) {
          tvl += pool.tvl || 0;
          volume24h += pool.volume24h || 0;
        }
        const result: LiquidityData = { tvl, volume24h };
        setCache(cacheKey, result);
        return result;
      }
      return undefined;
    } catch (error) {
      throw new Error(`Birdeye liquidity fetch failed for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 