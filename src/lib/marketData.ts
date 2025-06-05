import { PriceFeedData } from '../types/index';
import BirdeyeProvider from './birdeye';
import { JupiterProvider, PythProvider } from './priceDataProvider';

const birdeyeProvider = new BirdeyeProvider();
const jupiterProvider = new JupiterProvider();
const pythProvider = new PythProvider();

/**
 * Fetch the current price of a token (in USD if available) using Birdeye as primary, Jupiter as second, Pyth as fallback.
 * @param mint Token mint address
 * @returns price in USD (Birdeye), SOL (Jupiter), or Pyth fallback
 */
export async function getTokenPrice(mint: string): Promise<number> {
  // Try BirdeyeProvider first
  try {
    const birdeye = await birdeyeProvider.getCurrentPrice(mint);
    if (birdeye && typeof birdeye.price === 'number') {
      return birdeye.price;
    }
  } catch (err) {
    // Continue to Jupiter fallback
  }
  // Fallback to JupiterProvider
  try {
    const jupiter = await jupiterProvider.getCurrentPrice(mint);
    if (jupiter && typeof jupiter.price === 'number') {
      return jupiter.price;
    }
  } catch (err) {
    // Continue to Pyth fallback
  }
  // Fallback to PythProvider
  try {
    const pyth = await pythProvider.getCurrentPrice(mint);
    if (pyth && typeof pyth.price === 'number') {
      return pyth.price;
    }
    throw new Error('Price not found in Pyth response');
  } catch (error) {
    throw new Error(`Failed to fetch price for mint ${mint}: ${error instanceof Error ? error.message : String(error)}`);
  }
} 