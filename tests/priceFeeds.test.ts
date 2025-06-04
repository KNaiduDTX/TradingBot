import { Connection, PublicKey } from '@solana/web3.js';
import { PriceFeedManager, PriceFeedData } from '../src/lib/priceFeeds';
import { jest } from '@jest/globals';
import axios from 'axios';
import { MockPythClient, MockPythPriceAccount } from './types/mocks';

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

// Mock PythClient with typed mock
const mockPriceAccount: MockPythPriceAccount = {
  getPriceNoOlderThan: jest.fn().mockReturnValue(1.0),
  getConfidenceNoOlderThan: jest.fn().mockReturnValue(0.1),
  price: 1.0,
  confidence: 0.1,
  status: 1
};

const mockPythClient: MockPythClient = {
  getPriceAccount: jest.fn().mockResolvedValue(mockPriceAccount)
};

jest.mock('@pythnetwork/client', () => ({
  PythClient: jest.fn().mockImplementation(() => mockPythClient)
}));

describe('PriceFeedManager', () => {
  let priceFeedManager: PriceFeedManager;
  let mockConnection: jest.Mocked<Connection>;
  const mockMint = '11111111111111111111111111111111';

  beforeEach(() => {
    mockConnection = new Connection('https://api.mainnet-beta.solana.com') as jest.Mocked<Connection>;
    priceFeedManager = new PriceFeedManager(mockConnection);
    jest.clearAllMocks();
  });

  describe('getPriceData', () => {
    it('should return cached price data if available and not expired', async () => {
      const cachedData: PriceFeedData = {
        price: 1.0,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };

      // @ts-ignore - accessing private property for testing
      priceFeedManager.priceCache.set(mockMint, cachedData);

      const result = await priceFeedManager.getPriceData(mockMint);

      expect(result).toEqual(cachedData);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch new price data if cache is expired', async () => {
      const expiredData: PriceFeedData = {
        price: 1.0,
        source: 'jupiter',
        timestamp: Date.now() - 70000, // 70 seconds ago
        confidence: 0.9
      };

      // @ts-ignore - accessing private property for testing
      priceFeedManager.priceCache.set(mockMint, expiredData);

      const mockJupiterResponse = {
        data: {
          price: 1.2
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      };

      mockedAxios.get.mockResolvedValueOnce(mockJupiterResponse);

      const result = await priceFeedManager.getPriceData(mockMint);

      expect(result.price).toBe(1.2);
      expect(result.source).toBe('jupiter');
      expect(result.timestamp).toBeGreaterThan(expiredData.timestamp);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should fall back to Pyth if Jupiter fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Jupiter API error'));

      const result = await priceFeedManager.getPriceData(mockMint);

      expect(result.price).toBe(1.0);
      expect(result.source).toBe('pyth');
      expect(result.confidence).toBe(0.1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should throw error if all price feeds fail', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Jupiter API error'));
      // @ts-ignore - mocking PythClient
      jest.spyOn(priceFeedManager['pythClient'], 'getPriceAccount').mockRejectedValueOnce(new Error('Pyth API error'));

      await expect(priceFeedManager.getPriceData(mockMint)).rejects.toThrow('All price feeds failed');
    });
  });

  describe('clearCache', () => {
    it('should clear the price cache', async () => {
      const cachedData: PriceFeedData = {
        price: 1.0,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };

      // @ts-ignore - accessing private property for testing
      priceFeedManager.priceCache.set(mockMint, cachedData);

      priceFeedManager.clearCache();

      // @ts-ignore - accessing private property for testing
      expect(priceFeedManager.priceCache.size).toBe(0);
    });
  });
}); 