import { Logger } from './logger';

export class RetryQueue {
  private static instance: RetryQueue;
  private queue: Map<string, { job: () => Promise<any>; attempts: number; maxAttempts: number; baseDelay: number; maxDelay: number }>;
  private logger: Logger;

  private constructor() {
    this.queue = new Map();
    this.logger = new Logger('RetryQueue');
  }

  static getInstance(): RetryQueue {
    if (!this.instance) {
      this.instance = new RetryQueue();
    }
    return this.instance;
  }

  async enqueue(key: string, job: () => Promise<any>, options?: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number }): Promise<void> {
    const maxAttempts = options?.maxAttempts ?? 5;
    const baseDelay = options?.baseDelayMs ?? 500;
    const maxDelay = options?.maxDelayMs ?? 10000;

    this.queue.set(key, { job, attempts: 0, maxAttempts, baseDelay, maxDelay });
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    for (const [key, { job, attempts, maxAttempts, baseDelay, maxDelay }] of this.queue.entries()) {
      if (attempts >= maxAttempts) {
        this.logger.error(`Max retry attempts reached for job: ${key}`);
        this.queue.delete(key);
        continue;
      }

      try {
        await job();
        this.queue.delete(key);
      } catch (error: unknown) {
        const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
        this.logger.warn(`Retrying job: ${key} after ${delay}ms`, { error: error instanceof Error ? error : new Error(String(error)) });
        this.queue.set(key, { job, attempts: attempts + 1, maxAttempts, baseDelay, maxDelay });
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
} 