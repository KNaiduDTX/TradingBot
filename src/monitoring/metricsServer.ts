import express from 'express';
import { Registry, Counter, Histogram } from 'prom-client';

export class MetricsServer {
  private static instance: MetricsServer;
  private app: express.Application;
  private registry: Registry;
  private tradeCounter: Counter;
  private errorCounter: Counter;
  private tradeDuration: Histogram;

  private constructor() {
    this.app = express();
    this.registry = new Registry();
    this.tradeCounter = new Counter({
      name: 'trades_total',
      help: 'Total number of trades executed',
      labelNames: ['action']
    });
    this.errorCounter = new Counter({
      name: 'errors_total',
      help: 'Total number of errors encountered',
      labelNames: ['type']
    });
    this.tradeDuration = new Histogram({
      name: 'trade_duration_seconds',
      help: 'Duration of trade execution in seconds',
      labelNames: ['action']
    });
    this.registry.registerMetric(this.tradeCounter);
    this.registry.registerMetric(this.errorCounter);
    this.registry.registerMetric(this.tradeDuration);
  }

  static getInstance(): MetricsServer {
    if (!this.instance) {
      this.instance = new MetricsServer();
    }
    return this.instance;
  }

  start(port: number = 9090): void {
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', this.registry.contentType);
      res.end(await this.registry.metrics());
    });

    this.app.listen(port, () => {
      console.log(`Metrics server listening on port ${port}`);
    });
  }

  recordTrade(action: string): void {
    this.tradeCounter.inc({ action });
  }

  recordError(type: string): void {
    this.errorCounter.inc({ type });
  }

  recordTradeDuration(action: string, duration: number): void {
    this.tradeDuration.observe({ action }, duration);
  }
} 