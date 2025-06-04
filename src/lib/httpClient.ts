import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { TTLCache } from './cache';

export class RateLimitedHttpClient {
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly cache?: TTLCache<string, any>;

  constructor(options?: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    cache?: TTLCache<string, any>;
  }) {
    this.maxRetries = options?.maxRetries ?? 5;
    this.baseDelay = options?.baseDelayMs ?? 500;
    this.maxDelay = options?.maxDelayMs ?? 10000;
    this.cache = options?.cache;
  }

  async request<T = any>(config: AxiosRequestConfig, cacheKey?: string): Promise<AxiosResponse<T>> {
    // Check cache first
    if (this.cache && cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, fromCache: true } as AxiosResponse<T>;
      }
    }

    let attempt = 0;
    let lastError: any;
    while (attempt <= this.maxRetries) {
      try {
        const response = await axios.request<T>(config);
        if (this.cache && cacheKey) {
          this.cache.set(cacheKey, response);
        }
        return response;
      } catch (error: any) {
        lastError = error;
        // Handle rate limit (HTTP 429) or network errors
        const status = error?.response?.status;
        if (status === 429 || error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
          const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
          await new Promise(res => setTimeout(res, delay));
          attempt++;
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }
} 