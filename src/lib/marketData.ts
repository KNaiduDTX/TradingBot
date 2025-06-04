import axios from 'axios';

const JUPITER_API_URL = 'https://price.jup.ag/v4/price';

interface JupiterPriceResponse {
  data?: {
    [mint: string]: {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: number;
      lastUpdated: number;
    };
  };
}

/**
 * Fetch the current price of a token (in SOL) using Jupiter API
 * @param mint Token mint address
 * @returns price in SOL
 */
export async function getTokenPrice(mint: string): Promise<number> {
  try {
    const response = await axios.get<JupiterPriceResponse>(`${JUPITER_API_URL}?ids=${mint}`);
    const price = response.data?.data?.[mint]?.price;
    if (typeof price === 'number') {
      return price;
    }
    throw new Error('Price not found in Jupiter response');
  } catch (error) {
    throw new Error(`Failed to fetch price for mint ${mint}: ${error instanceof Error ? error.message : String(error)}`);
  }
} 