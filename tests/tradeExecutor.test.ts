import { Connection, PublicKey } from '@solana/web3.js';
import { TradeExecutor } from '../src/lib/tradeExecutor';
import { TokenInfo, TradeSignal } from '../src/types';
import axios from 'axios';
import { jest } from '@jest/globals';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Connection
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn(),
  PublicKey: jest.fn(),
  Transaction: {
    from: jest.fn()
  },
  sendAndConfirmTransaction: jest.fn()
}));

describe('TradeExecutor', () => {
  let tradeExecutor: TradeExecutor;
  let mockConnection: jest.Mocked<Connection>;
  let mockToken: TokenInfo;
  let mockSignal: TradeSignal;

  beforeEach(() => {
    mockConnection = new Connection('https://api.mainnet-beta.solana.com') as jest.Mocked<Connection>;
    tradeExecutor = new TradeExecutor(mockConnection);

    mockToken = {
      mint: new PublicKey('11111111111111111111111111111111'),
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 9,
      supply: 1000000000,
      createdAt: new Date()
    };

    mockSignal = {
      token: mockToken,
      action: 'BUY',
      amount: 1000000000, // 1 token with 9 decimals
      price: 1.0,
      confidence: 0.8,
      timestamp: new Date().toISOString()
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('simulateTrade', () => {
    it('should return success with correct slippage and fees', async () => {
      const mockQuoteResponse = {
        data: {
          inputMint: mockToken.mint.toString(),
          outputMint: 'So11111111111111111111111111111111111111112',
          inAmount: 1000000000,
          outAmount: 1000000000,
          otherAmountThreshold: 990000000,
          fee: 100000,
          priceImpactPct: 0.1,
          routePlan: []
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as const;

      mockedAxios.get.mockResolvedValueOnce(mockQuoteResponse);

      const result = await tradeExecutor.simulateTrade(mockSignal);

      expect(result.success).toBe(true);
      expect(result.slippage).toBeDefined();
      expect(result.gasFees).toBeDefined();
      expect(result.dexFees).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await tradeExecutor.simulateTrade(mockSignal);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('executeTrade', () => {
    it('should execute trade successfully', async () => {
      const mockQuoteResponse = {
        data: {
          inputMint: mockToken.mint.toString(),
          outputMint: 'So11111111111111111111111111111111111111112',
          inAmount: 1000000000,
          outAmount: 1000000000,
          otherAmountThreshold: 990000000,
          fee: 100000,
          priceImpactPct: 0.1,
          routePlan: []
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as const;

      const mockSwapResponse = {
        data: {
          swapTransaction: 'base64EncodedTransaction'
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as const;

      mockedAxios.get.mockResolvedValueOnce(mockQuoteResponse);
      mockedAxios.post.mockResolvedValueOnce(mockSwapResponse);

      const result = await tradeExecutor.executeTrade(mockSignal, new PublicKey('11111111111111111111111111111111'));

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.slippage).toBeDefined();
      expect(result.gasFees).toBeDefined();
      expect(result.dexFees).toBeDefined();
    });

    it('should retry on failure', async () => {
      const mockQuoteResponse = {
        data: {
          inputMint: mockToken.mint.toString(),
          outputMint: 'So11111111111111111111111111111111111111112',
          inAmount: 1000000000,
          outAmount: 1000000000,
          otherAmountThreshold: 990000000,
          fee: 100000,
          priceImpactPct: 0.1,
          routePlan: []
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as const;

      const mockSwapResponse = {
        data: {
          swapTransaction: 'base64EncodedTransaction'
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      } as const;

      mockedAxios.get.mockResolvedValueOnce(mockQuoteResponse);
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      mockedAxios.post.mockResolvedValueOnce(mockSwapResponse);

      const result = await tradeExecutor.executeTrade(mockSignal, new PublicKey('11111111111111111111111111111111'));

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const result = await tradeExecutor.executeTrade(mockSignal, new PublicKey('11111111111111111111111111111111'));

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
}); 