import { Connection, PublicKey } from '@solana/web3.js';
import { ExitEngine, ExitSignal } from '../src/commands/exitEngine';
import { TokenInfo, TradeResult } from '../src/types';
import { PriceFeedData } from '../src/lib/priceFeeds';
import { jest } from '@jest/globals';

// Mock Connection
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn(),
  PublicKey: jest.fn(),
  Transaction: {
    from: jest.fn()
  },
  sendAndConfirmTransaction: jest.fn()
}));

describe('ExitEngine', () => {
  let exitEngine: ExitEngine;
  let mockConnection: jest.Mocked<Connection>;
  let mockToken: TokenInfo;
  let mockTrade: TradeResult;

  beforeEach(() => {
    mockConnection = new Connection('https://api.mainnet-beta.solana.com') as jest.Mocked<Connection>;
    exitEngine = new ExitEngine(mockConnection);

    mockToken = {
      mint: new PublicKey('11111111111111111111111111111111'),
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 9,
      supply: 1000000000,
      createdAt: new Date()
    };

    mockTrade = {
      token: mockToken,
      action: 'BUY',
      amount: 1000000000,
      price: 1.0,
      timestamp: new Date().toISOString()
    };
  });

  describe('checkExitConditions', () => {
    it('should trigger take profit exit', async () => {
      // Mock price feed to return 20% higher price
      const mockPriceData: PriceFeedData = {
        price: 1.2,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };

      jest.spyOn(exitEngine['priceFeedManager'], 'getPriceData').mockResolvedValueOnce(mockPriceData);

      const result = await exitEngine.checkExitConditions(mockTrade);

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toContain('Take profit triggered');
      expect(result.currentPnL).toBe(0.2); // 20% profit
    });

    it('should trigger stop loss exit', async () => {
      // Mock price feed to return 15% lower price
      const mockPriceData: PriceFeedData = {
        price: 0.85,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };

      jest.spyOn(exitEngine['priceFeedManager'], 'getPriceData').mockResolvedValueOnce(mockPriceData);

      const result = await exitEngine.checkExitConditions(mockTrade);

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toContain('Stop loss triggered');
      expect(result.currentPnL).toBe(-0.15); // 15% loss
    });

    it('should trigger time-based exit', async () => {
      // Create a trade that's older than 1 hour
      const oldTrade = {
        ...mockTrade,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      };

      // Mock price feed to return same price
      const mockPriceData: PriceFeedData = {
        price: 1.0,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };

      jest.spyOn(exitEngine['priceFeedManager'], 'getPriceData').mockResolvedValueOnce(mockPriceData);

      const result = await exitEngine.checkExitConditions(oldTrade);

      expect(result.shouldExit).toBe(true);
      expect(result.reason).toContain('Maximum holding time reached');
      expect(result.currentPnL).toBe(0);
    });

    it('should not trigger exit for profitable trade within time limit', async () => {
      // Mock price feed to return 5% higher price
      const mockPriceData: PriceFeedData = {
        price: 1.05,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };

      jest.spyOn(exitEngine['priceFeedManager'], 'getPriceData').mockResolvedValueOnce(mockPriceData);

      const result = await exitEngine.checkExitConditions(mockTrade);

      expect(result.shouldExit).toBe(false);
      expect(result.currentPnL).toBe(0.05); // 5% profit
    });
  });

  describe('executeExit', () => {
    it('should execute exit successfully', async () => {
      const exitSignal: ExitSignal = {
        shouldExit: true,
        reason: 'Take profit triggered at 20.00%',
        currentPnL: 0.2
      };

      const result = await exitEngine.executeExit(mockTrade, exitSignal);

      expect(result).toBe(true);
    });

    it('should handle exit execution failure', async () => {
      const exitSignal: ExitSignal = {
        shouldExit: true,
        reason: 'Take profit triggered at 20.00%',
        currentPnL: 0.2
      };

      // Mock a failure scenario
      jest.spyOn(exitEngine['databaseManager'], 'saveTradeResult').mockRejectedValueOnce(new Error('Database error'));

      const result = await exitEngine.executeExit(mockTrade, exitSignal);

      expect(result).toBe(false);
    });
  });

  describe('checkAndExecuteExits', () => {
    it('should check and execute exits for all open trades', async () => {
      const mockPositions = [
        {
          id: 'pos-1',
          token_mint: mockToken.mint.toString(),
          entry_price: 1.0,
          amount: 1000000000,
          entry_time: new Date().toISOString(),
          stop_loss: 0.9,
          take_profit: 1.15
        },
        {
          id: 'pos-2',
          token_mint: new PublicKey('22222222222222222222222222222222').toString(),
          entry_price: 1.5,
          amount: 1000000000,
          entry_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          stop_loss: 1.35,
          take_profit: 1.65
        }
      ];

      jest.spyOn(exitEngine['databaseManager'], 'getActivePositions').mockResolvedValueOnce(mockPositions);
      
      // Mock price feeds for both trades
      const mockPriceData1: PriceFeedData = {
        price: 1.2,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };

      const mockPriceData2: PriceFeedData = {
        price: 1.0,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };

      jest.spyOn(exitEngine['priceFeedManager'], 'getPriceData')
        .mockResolvedValueOnce(mockPriceData1) // 20% profit for first trade
        .mockResolvedValueOnce(mockPriceData2); // 33% loss for second trade

      await exitEngine.checkAndExecuteExits();

      // Verify that saveTradeResult was called for both trades
      expect(exitEngine['databaseManager'].saveTradeResult).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during batch exit check', async () => {
      jest.spyOn(exitEngine['databaseManager'], 'getActivePositions').mockRejectedValueOnce(new Error('Database error'));

      await expect(exitEngine.checkAndExecuteExits()).rejects.toThrow('Database error');
    });
  });
}); 