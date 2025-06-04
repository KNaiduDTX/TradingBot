import dotenv from 'dotenv';

// Load environment variables from .env.test if it exists
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Global test timeout
jest.setTimeout(30000); // 30 seconds

// Mock console methods to keep test output clean
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}; 