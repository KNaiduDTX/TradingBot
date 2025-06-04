/**
 * Mock types for testing external dependencies
 */

/**
 * Mock interface for Pyth price account
 * Matches the structure used in our PriceFeedManager implementation
 */
export interface MockPythPriceAccount {
  getPriceNoOlderThan: jest.Mock<number, [number]>;
  getConfidenceNoOlderThan: jest.Mock<number, [number]>;
  price: number;
  confidence: number;
  status: number;
}

/**
 * Mock interface for Pyth client
 * Matches the methods we use from @pythnetwork/client
 */
export interface MockPythClient {
  getPriceAccount: jest.Mock<Promise<MockPythPriceAccount>, [any]>;
} 