import { Connection, PublicKey } from '@solana/web3.js';
import { TokenDetector } from '../../src/commands/detectTokens';
import { TokenInfo } from '../../src/types';

jest.mock('@solana/web3.js');

describe('TokenDetector', () => {
  let tokenDetector: TokenDetector;
  let mockConnection: jest.Mocked<Connection>;

  beforeEach(() => {
    mockConnection = new Connection('mock-url') as jest.Mocked<Connection>;
    tokenDetector = new TokenDetector(mockConnection);
  });

  describe('detectNewTokens', () => {
    it('should return an array of detected tokens', async () => {
      const tokens = await tokenDetector.detectNewTokens();
      expect(Array.isArray(tokens)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockConnection.getProgramAccounts = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(tokenDetector.detectNewTokens()).rejects.toThrow('Network error');
    });
  });

  describe('validateMemecoin', () => {
    it('should validate a token as a memecoin', async () => {
      const mockToken = new PublicKey('mock-token-address');
      const result = await tokenDetector.validateMemecoin(mockToken);
      expect(typeof result).toBe('boolean');
    });

    it('should handle invalid token addresses', async () => {
      const invalidToken = new PublicKey('invalid-address');
      await expect(tokenDetector.validateMemecoin(invalidToken)).rejects.toThrow();
    });
  });
}); 