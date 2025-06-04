import { Logger } from './logger';

export class CircuitBreaker {
  private static instance: CircuitBreaker;
  private failures: Map<string, { count: number; lastFailure: number }>;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private logger: Logger;

  private constructor(options?: { failureThreshold?: number; resetTimeoutMs?: number }) {
    this.failures = new Map();
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 60000; // 1 minute
    this.logger = new Logger('CircuitBreaker');
  }

  static getInstance(options?: { failureThreshold?: number; resetTimeoutMs?: number }): CircuitBreaker {
    if (!this.instance) {
      this.instance = new CircuitBreaker(options);
    }
    return this.instance;
  }

  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.isOpen(key)) {
      this.logger.warn(`Circuit breaker is open for key: ${key}`);
      throw new Error(`Circuit breaker is open for key: ${key}`);
    }

    try {
      const result = await operation();
      this.reset(key);
      return result;
    } catch (error: unknown) {
      this.recordFailure(key);
      throw error;
    }
  }

  private isOpen(key: string): boolean {
    const failure = this.failures.get(key);
    if (!failure) return false;

    if (failure.count >= this.failureThreshold) {
      const timeSinceLastFailure = Date.now() - failure.lastFailure;
      if (timeSinceLastFailure < this.resetTimeoutMs) {
        return true;
      }
      this.reset(key);
    }
    return false;
  }

  private recordFailure(key: string): void {
    const failure = this.failures.get(key) || { count: 0, lastFailure: 0 };
    failure.count += 1;
    failure.lastFailure = Date.now();
    this.failures.set(key, failure);
    this.logger.warn(`Failure recorded for key: ${key}, count: ${failure.count}`);
  }

  private reset(key: string): void {
    this.failures.delete(key);
    this.logger.info(`Circuit breaker reset for key: ${key}`);
  }
} 