import { TokenInfo, TradeSignal } from '../types/index';
import { Logger } from '../lib/logger';
import * as ort from 'onnxruntime-node';
import axios from 'axios';
import { getTokenPrice } from '../lib/marketData';
import { Connection, PublicKey } from '@solana/web3.js';
import { config } from '../lib/config';

interface ModelInput {
  price: number;
  volume24h: number;
  liquidityUSD: number;
  priceChange24h: number;
  holders: number;
  socialScore: number;
  marketCap: number;
}

interface RiskMetrics {
  volatility: number;
  liquidityDepth: number;
  marketCap: number;
  priceFeedReliability: number;
  slippageEstimate: number;
  walletRisk: number;
  overallRisk: number;
}

interface PriceFeedData {
  price: number;
  source: 'jupiter' | 'pyth' | 'switchboard';
  timestamp: number;
  confidence: number;
}

interface MarketData {
  price: number;
  volume24h: number;
  liquidityUSD: number;
  priceChange24h: number;
  lastUpdate: Date;
}

/**
 * TradeEvaluator evaluates potential trades using an ML model and market data, and computes risk metrics.
 */
export class TradeEvaluator {
  private logger: Logger;
  private model: ort.InferenceSession | null = null;
  private readonly CONFIDENCE_THRESHOLD = 0.67;
  private readonly MAX_POSITION_SIZE = 1.0; // SOL
  private readonly MIN_LIQUIDITY = 10000; // USD
  private readonly MAX_SLIPPAGE = 0.015; // 1.5%
  private readonly PRICE_CACHE_TTL = 60000; // 1 minute
  private priceCache: Map<string, PriceFeedData> = new Map();
  private readonly KNOWN_SCAM_WALLETS: Set<string>;

  constructor() {
    this.logger = new Logger('TradeEvaluator');
    this.KNOWN_SCAM_WALLETS = new Set(config.getConfig().scamWallets);
  }

  /**
   * Initialize the ML model for trade evaluation
   */
  async initializeModel(): Promise<void> {
    try {
      this.model = await ort.InferenceSession.create(config.getConfig().modelPath);
      this.logger.info('ML model initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ML model', {
        error: error instanceof Error ? error : new Error(String(error)),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Evaluate a potential trade using ML model and market data
   * @param token Token information
   * @returns Trade signal if conditions are met, otherwise null
   */
  async evaluateTrade(token: TokenInfo): Promise<TradeSignal | null> {
    try {
      if (!this.model) {
        await this.initializeModel();
      }
      // Get market data
      const marketData = await this.getMarketData(token);
      // Prepare model input
      const modelInput = this.prepareModelInput(token, marketData);
      // Run model inference
      const score = await this.runModelInference(modelInput);
      // Calculate risk metrics
      const riskMetrics = await this.calculateRiskMetrics(token, marketData);
      // Check if trade meets criteria
      const cfg = config.getConfig();
      if (score >= cfg.confidenceThreshold && marketData.liquidityUSD >= cfg.minLiquidityUSD) {
        const suggestedSize = this.calculatePositionSize(score, riskMetrics, marketData);
        return {
          token,
          action: 'BUY',
          confidence: score,
          timestamp: new Date(),
          price: marketData.price,
          volume: marketData.volume24h,
          score,
          suggestedSize,
          riskMetrics,
          predictionMetrics: {
            expectedReturn: this.calculateExpectedReturn(score, riskMetrics),
            maxDrawdown: this.calculateMaxDrawdown(riskMetrics),
            sharpeRatio: this.calculateSharpeRatio(score, riskMetrics)
          }
        };
      }
      this.logger.debug('Trade evaluation result', {
        tokenMint: token.mint.toString(),
        score,
        confidence: score >= cfg.confidenceThreshold,
        liquidity: marketData.liquidityUSD >= cfg.minLiquidityUSD
      });
      return null;
    } catch (error) {
      this.logger.error('Error evaluating trade', {
        error: error instanceof Error ? error : new Error(String(error)),
        stack: error instanceof Error ? error.stack : undefined,
        tokenMint: token.mint.toString()
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Prepare input data for the ML model
   */
  private prepareModelInput(token: TokenInfo, marketData: MarketData): ModelInput {
    return {
      price: marketData.price,
      volume24h: marketData.volume24h,
      liquidityUSD: marketData.liquidityUSD,
      priceChange24h: marketData.priceChange24h,
      holders: token.holders || 0,
      socialScore: token.socialScore || 0,
      marketCap: marketData.price * (token.supply / Math.pow(10, token.decimals))
    };
  }

  /**
   * Run model inference
   */
  private async runModelInference(input: ModelInput): Promise<number> {
    if (!this.model) throw new Error('Model not initialized');

    // Convert input to tensor
    const inputTensor = new ort.Tensor(
      'float32',
      new Float32Array(Object.values(input)),
      [1, Object.keys(input).length]
    );

    // Run inference
    const results = await this.model.run({ input: inputTensor });
    const output = results.output as ort.Tensor;
    
    // Get prediction score
    return output.data[0] as number;
  }

  /**
   * Calculate comprehensive risk metrics for a potential trade
   */
  private async calculateRiskMetrics(
    token: TokenInfo,
    marketData: MarketData
  ): Promise<RiskMetrics> {
    try {
      // Get price feed data with fallback
      const priceFeedData = await this.getPriceFeedData(token.mint.toString());
      
      // Calculate volatility (24h price change)
      const volatility = Math.abs(marketData.priceChange24h) / 100;
      
      // Calculate liquidity depth (liquidity / 24h volume)
      const liquidityDepth = marketData.liquidityUSD / (marketData.volume24h || 1);
      
      // Calculate market cap
      const marketCap = marketData.price * (token.supply / Math.pow(10, token.decimals));
      
      // Calculate price feed reliability
      const priceFeedReliability = this.calculatePriceFeedReliability(priceFeedData);
      
      // Estimate slippage based on liquidity depth
      const slippageEstimate = this.estimateSlippage(liquidityDepth, this.MAX_POSITION_SIZE);
      
      // Calculate wallet risk
      const walletRisk = await this.calculateWalletRisk(token);
      
      // Calculate overall risk score (0-1, higher is riskier)
      const overallRisk = this.calculateOverallRisk({
        volatility,
        liquidityDepth,
        marketCap,
        priceFeedReliability,
        slippageEstimate,
        walletRisk
      });

      this.logger.debug('Risk metrics calculated', {
        tokenMint: token.mint.toString(),
        volatility,
        liquidityDepth,
        marketCap,
        priceFeedReliability,
        slippageEstimate,
        walletRisk,
        overallRisk
      });

      return {
        volatility,
        liquidityDepth,
        marketCap,
        priceFeedReliability,
        slippageEstimate,
        walletRisk,
        overallRisk
      };
    } catch (error) {
      this.logger.error('Error calculating risk metrics:', {
        error: error instanceof Error ? error : new Error(String(error)),
        tokenMint: token.mint.toString()
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Get price feed data with fallback to multiple sources
   */
  private async getPriceFeedData(mint: string): Promise<PriceFeedData> {
    // Check cache first
    const cached = this.priceCache.get(mint);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
      return cached;
    }

    // Try Jupiter first
    try {
      const jupiterPrice = await getTokenPrice(mint);
      const data: PriceFeedData = {
        price: jupiterPrice,
        source: 'jupiter',
        timestamp: Date.now(),
        confidence: 0.9
      };
      this.priceCache.set(mint, data);
      return data;
    } catch (error) {
      this.logger.warn('Jupiter price feed failed, trying Pyth', { error: error instanceof Error ? error : new Error(String(error)), mint });
    }
    // Try Pyth
    try {
      const pythProvider = new (await import('../lib/priceDataProvider')).PythProvider();
      const pythData = await pythProvider.getCurrentPrice(mint);
      if (pythData) {
        const data: PriceFeedData = {
          price: pythData.price,
          source: 'pyth',
          timestamp: Date.now(),
          confidence: pythData.confidence || 0.95
        };
        this.priceCache.set(mint, data);
        return data;
      }
    } catch (error) {
      this.logger.warn('Pyth price feed failed, trying Switchboard', { error: error instanceof Error ? error : new Error(String(error)), mint });
    }
    // Try Switchboard (if implemented)
    try {
      // Placeholder: If SwitchboardProvider exists, use it
      // const switchboardProvider = new SwitchboardProvider();
      // const switchboardData = await switchboardProvider.getCurrentPrice(mint);
      // if (switchboardData) { ... }
    } catch (error) {
      this.logger.warn('Switchboard price feed failed', { error: error instanceof Error ? error : new Error(String(error)), mint });
    }
    throw new Error(`All price feeds failed for mint: ${mint}`);
  }

  /**
   * Calculate price feed reliability score
   */
  private calculatePriceFeedReliability(priceFeed: PriceFeedData): number {
    // Base reliability on source and confidence
    const sourceReliability = {
      'jupiter': 0.9,
      'pyth': 0.95,
      'switchboard': 0.85
    }[priceFeed.source] || 0.5;

    return sourceReliability * priceFeed.confidence;
  }

  /**
   * Estimate slippage based on liquidity depth and trade size
   */
  private estimateSlippage(liquidityDepth: number, tradeSize: number): number {
    // Simple slippage model: tradeSize / liquidityDepth
    return Math.min(1, tradeSize / liquidityDepth);
  }

  /**
   * Calculate wallet risk score
   */
  private async calculateWalletRisk(token: TokenInfo): Promise<number> {
    // Check if the token mint is in the known scam wallet list
    if (this.KNOWN_SCAM_WALLETS.has(token.mint.toString())) {
      return 1.0; // Maximum risk
    }
    return 0.1; // Default low risk
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallRisk(metrics: Omit<RiskMetrics, 'overallRisk'>): number {
    const weights = {
      volatility: 0.2,
      liquidityDepth: 0.2,
      marketCap: 0.1,
      priceFeedReliability: 0.2,
      slippageEstimate: 0.2,
      walletRisk: 0.1
    };

    // Normalize metrics to 0-1 range
    const normalizedMetrics = {
      volatility: Math.min(1, metrics.volatility),
      liquidityDepth: Math.min(1, 1 / metrics.liquidityDepth),
      marketCap: Math.min(1, 1 / (metrics.marketCap / 1e6)), // Normalize to millions
      priceFeedReliability: 1 - metrics.priceFeedReliability,
      slippageEstimate: metrics.slippageEstimate,
      walletRisk: metrics.walletRisk
    };

    // Calculate weighted average
    return Object.entries(weights).reduce((score, [key, weight]) => {
      return score + normalizedMetrics[key as keyof typeof normalizedMetrics] * weight;
    }, 0);
  }

  /**
   * Calculate optimal position size based on risk parameters
   */
  private calculatePositionSize(
    score: number,
    riskMetrics: { volatility: number; liquidityDepth: number; marketCap: number },
    marketData: MarketData
  ): number {
    // Base size on confidence score
    let size = this.MAX_POSITION_SIZE * score;
    
    // Adjust for volatility
    size *= (1 - riskMetrics.volatility);
    
    // Adjust for liquidity depth
    size *= Math.min(1, riskMetrics.liquidityDepth / 2);
    
    // Ensure minimum size
    return Math.max(0.1, Math.min(this.MAX_POSITION_SIZE, size));
  }

  /**
   * Calculate expected return based on model score and risk metrics
   */
  private calculateExpectedReturn(
    score: number,
    riskMetrics: { volatility: number; liquidityDepth: number; marketCap: number }
  ): number {
    // Simple expected return calculation
    return score * (1 - riskMetrics.volatility) * 100; // as percentage
  }

  /**
   * Calculate maximum drawdown based on risk metrics
   */
  private calculateMaxDrawdown(
    riskMetrics: { volatility: number; liquidityDepth: number; marketCap: number }
  ): number {
    // Simple drawdown estimation
    return riskMetrics.volatility * 200; // as percentage
  }

  /**
   * Calculate Sharpe ratio based on score and risk metrics
   */
  private calculateSharpeRatio(
    score: number,
    riskMetrics: { volatility: number; liquidityDepth: number; marketCap: number }
  ): number {
    // Simple Sharpe ratio calculation
    const riskFreeRate = 0.02; // 2% annual
    return (score - riskFreeRate) / riskMetrics.volatility;
  }

  /**
   * Get market data for a token
   */
  private async getMarketData(token: TokenInfo): Promise<MarketData> {
    // Use getTokenPrice for price, and set other fields to 0 or fetch from DEX if available
    const price = await getTokenPrice(token.mint.toString());
    // TODO: Optionally fetch volume24h, liquidityUSD, priceChange24h from DEX APIs
    return {
      price,
      volume24h: 0,
      liquidityUSD: 0,
      priceChange24h: 0,
      lastUpdate: new Date()
    };
  }

  /**
   * Fetch market data for a token
   */
  private async fetchMarketData(mint: string): Promise<number> {
    return getTokenPrice(mint);
  }
}

// TODO: Implement Pyth/Switchboard fallback
async function fetchPriceFallback(symbol: string): Promise<number> {
  // Use getTokenPrice as a fallback
  return getTokenPrice(symbol);
}

// TODO: Implement wallet validation against scam list
function validateWalletAgainstScamList(wallet: string): boolean {
  // Placeholder: Always return true (not a scam)
  return true;
}

// TODO: Implement market data fetching from DEX or price feed
async function fetchMarketDataFromDEXorFeed(token: string): Promise<number> {
  // Use getTokenPrice as a fallback
  return getTokenPrice(token);
} 