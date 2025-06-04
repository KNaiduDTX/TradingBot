import axios from 'axios';

/**
 * URL to the Pyth price feed ID mapping (Solana mainnet-beta) from the official Pyth JS client repo.
 * See: https://github.com/pyth-network/pyth-client-js/blob/main/src/ids.json
 */
const PYTH_IDS_URL =
  'https://raw.githubusercontent.com/pyth-network/pyth-client-js/main/src/ids.json';

// Cache for the mapping and its expiration
let mintToFeed: Record<string, string> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches and caches the mapping from Solana mint addresses to Pyth price feed IDs.
 * @returns The mapping object { [mint]: feedId }
 */
async function fetchMintToFeedMapping(): Promise<Record<string, string>> {
  const now = Date.now();
  if (mintToFeed && now < cacheExpiry) {
    return mintToFeed;
  }
  try {
    const response = await axios.get(PYTH_IDS_URL);
    // The structure is: { "mainnet-beta": { "products": [ ... ] } }
    const products = response.data['mainnet-beta']?.products;
    if (!Array.isArray(products)) {
      throw new Error('Invalid Pyth ids.json structure');
    }
    // Build mapping: { mint: price_feed }
    const mapping: Record<string, string> = {};
    for (const product of products) {
      if (product.symbol && product.price_account && product.base && product.quote) {
        // Use the token mint as the key if available, else skip
        if (product.token_address) {
          mapping[product.token_address] = product.price_account;
        }
        // Also map by base token mint if available
        if (product.base_token_address) {
          mapping[product.base_token_address] = product.price_account;
        }
      }
    }
    mintToFeed = mapping;
    cacheExpiry = now + CACHE_TTL_MS;
    return mapping;
  } catch (error) {
    throw new Error(
      `Failed to fetch Pyth mint-to-feed mapping: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Returns the Pyth price feed ID for a given Solana mint address, or undefined if not found.
 * Dynamically fetches and caches the mapping from Pyth's GitHub.
 * @param mint Solana token mint address
 * @returns Pyth price feed ID or undefined
 */
export async function getPythFeedIdForMint(mint: string): Promise<string | undefined> {
  const mapping = await fetchMintToFeedMapping();
  return mapping[mint];
} 