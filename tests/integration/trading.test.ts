import { TradingBot } from '../../src/commands/trading';
import { DatabaseManager } from '../../src/lib/database';
import { MetricsServer } from '../../src/monitoring/metricsServer';
import { PublicKey } from '@solana/web3.js';
import { config } from '../../src/lib/config';

describe('TradingBot Integration', () => {
  let tradingBot: TradingBot;
  let dbManager: DatabaseManager;
  let metricsServer: MetricsServer;

  beforeAll(async () => {
    dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    metricsServer = MetricsServer.getInstance();
    await metricsServer.start();
    tradingBot = new TradingBot(dbManager, metricsServer);
  });

  afterAll(async () => {
    await dbManager.close();
    await metricsServer.stop();
  });

  it('should process and execute a valid trade signal', async () => {
    const signal = {
      token: {
        mint: new PublicKey('mockMint'),
        symbol: 'MOCK',
        name: 'Mock Token',
        decimals: 9,
        supply: 1000000,
      },
      action: 'BUY' as const,
      confidence: config.confidenceThreshold + 0.1,
      timestamp: new Date(),
      price: 1.0,
      volume: 1000,
      score: 0.75,
      suggestedSize: 0.1,
      riskMetrics: {
        volatility: 0.1,
        liquidityDepth: 10000,
        marketCap: 1000000,
        priceFeedReliability: 0.9,
        slippageEstimate: 0.01,
        walletRisk: 0.1,
        overallRisk: config.maxDrawdown - 0.1,
      },
      predictionMetrics: {
        expectedReturn: 0.15,
        maxDrawdown: 0.1,
        sharpeRatio: 1.5,
      },
    };

    const result = await tradingBot.processTradeSignal(signal);
    expect(result.success).toBe(true);

    // Verify trade was logged in database
    const trades = await dbManager.query({
      table: 'trades',
      where: { token_mint: signal.token.mint.toString() },
    });
    expect(trades.data).toHaveLength(1);
    expect(trades.data?.[0].action).toBe('BUY');
  });

  it('should handle concurrent trade signals', async () => {
    const signals = Array(5).fill(null).map((_, i) => ({
      token: {
        mint: new PublicKey(`mockMint${i}`),
        symbol: `MOCK${i}`,
        name: `Mock Token ${i}`,
        decimals: 9,
        supply: 1000000,
      },
      action: 'BUY' as const,
      confidence: config.confidenceThreshold + 0.1,
      timestamp: new Date(),
      price: 1.0,
      volume: 1000,
      score: 0.75,
      suggestedSize: 0.1,
      riskMetrics: {
        volatility: 0.1,
        liquidityDepth: 10000,
        marketCap: 1000000,
        priceFeedReliability: 0.9,
        slippageEstimate: 0.01,
        walletRisk: 0.1,
        overallRisk: config.maxDrawdown - 0.1,
      },
      predictionMetrics: {
        expectedReturn: 0.15,
        maxDrawdown: 0.1,
        sharpeRatio: 1.5,
      },
    }));

    const results = await Promise.all(
      signals.map(signal => tradingBot.processTradeSignal(signal))
    );

    expect(results.every(r => r.success)).toBe(true);
    expect(results).toHaveLength(5);
  });

  it('should maintain data consistency during errors', async () => {
    const invalidSignal = {
      token: {
        mint: new PublicKey('mockMint'),
        symbol: 'MOCK',
        name: 'Mock Token',
        decimals: 9,
        supply: 1000000,
      },
      action: 'BUY' as const,
      confidence: config.confidenceThreshold - 0.1, // Below threshold
      timestamp: new Date(),
      price: 1.0,
      volume: 1000,
      score: 0.75,
      suggestedSize: 0.1,
      riskMetrics: {
        volatility: 0.1,
        liquidityDepth: 10000,
        marketCap: 1000000,
        priceFeedReliability: 0.9,
        slippageEstimate: 0.01,
        walletRisk: 0.1,
        overallRisk: config.maxDrawdown - 0.1,
      },
      predictionMetrics: {
        expectedReturn: 0.15,
        maxDrawdown: 0.1,
        sharpeRatio: 1.5,
      },
    };

    const result = await tradingBot.processTradeSignal(invalidSignal);
    expect(result.success).toBe(false);

    // Verify no trade was logged
    const trades = await dbManager.query({
      table: 'trades',
      where: { token_mint: invalidSignal.token.mint.toString() },
    });
    expect(trades.data).toHaveLength(0);
  });
}); 