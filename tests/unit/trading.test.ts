import { TradeSignal, TradeResult } from '../../src/types';
import { TradingBot } from '../../src/commands/trading';
import { DatabaseManager } from '../../src/lib/database';
import { MetricsServer } from '../../src/monitoring/metricsServer';
import { mock, MockProxy } from 'jest-mock-extended';

describe('TradingBot', () => {
  let tradingBot: TradingBot;
  let dbManager: MockProxy<DatabaseManager>;
  let metricsServer: MockProxy<MetricsServer>;

  beforeEach(() => {
    dbManager = mock<DatabaseManager>();
    metricsServer = mock<MetricsServer>();
    tradingBot = new TradingBot(dbManager, metricsServer);
  });

  describe('processTradeSignal', () => {
    const mockSignal: TradeSignal = {
      token: {
        mint: 'mockMint',
        symbol: 'MOCK',
        name: 'Mock Token',
        decimals: 9,
        supply: 1000000,
      },
      action: 'BUY',
      confidence: 0.8,
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
        overallRisk: 0.2,
      },
      predictionMetrics: {
        expectedReturn: 0.15,
        maxDrawdown: 0.1,
        sharpeRatio: 1.5,
      },
    };

    it('should execute buy trade when signal is valid', async () => {
      const result = await tradingBot.processTradeSignal(mockSignal);
      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(dbManager.logTrade).toHaveBeenCalled();
      expect(metricsServer.recordTrade).toHaveBeenCalled();
    });

    it('should reject trade when confidence is too low', async () => {
      const lowConfidenceSignal = { ...mockSignal, confidence: 0.4 };
      const result = await tradingBot.processTradeSignal(lowConfidenceSignal);
      expect(result.success).toBe(false);
      expect(result.error).toContain('confidence');
    });

    it('should reject trade when risk is too high', async () => {
      const highRiskSignal = {
        ...mockSignal,
        riskMetrics: { ...mockSignal.riskMetrics, overallRisk: 0.8 },
      };
      const result = await tradingBot.processTradeSignal(highRiskSignal);
      expect(result.success).toBe(false);
      expect(result.error).toContain('risk');
    });
  });

  describe('executeTrade', () => {
    it('should handle network errors gracefully', async () => {
      const mockError = new Error('Network error');
      jest.spyOn(tradingBot, 'executeTrade').mockRejectedValueOnce(mockError);
      
      const result = await tradingBot.executeTrade({
        token: 'mockMint',
        amount: 1.0,
        price: 1.0,
        action: 'BUY',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(metricsServer.recordError).toHaveBeenCalled();
    });
  });
}); 