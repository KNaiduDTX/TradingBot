import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Solana Trading Bot API',
      version: '1.0.0',
      description: 'API documentation for the Solana Trading Bot',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        TradeSignal: {
          type: 'object',
          properties: {
            token: {
              type: 'object',
              properties: {
                mint: { type: 'string' },
                symbol: { type: 'string' },
                name: { type: 'string' },
                decimals: { type: 'number' },
                supply: { type: 'number' },
              },
            },
            action: { type: 'string', enum: ['BUY', 'SELL'] },
            confidence: { type: 'number' },
            timestamp: { type: 'string', format: 'date-time' },
            price: { type: 'number' },
            volume: { type: 'number' },
            score: { type: 'number' },
            suggestedSize: { type: 'number' },
          },
        },
        TradeResult: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            txHash: { type: 'string' },
            error: { type: 'string' },
            slippage: { type: 'number' },
            gasFees: { type: 'number' },
            dexFees: { type: 'number' },
            totalFees: { type: 'number' },
          },
        },
        PerformanceMetrics: {
          type: 'object',
          properties: {
            totalPnL: { type: 'number' },
            winRate: { type: 'number' },
            avgTradeDuration: { type: 'number' },
            bestTrade: { $ref: '#/components/schemas/TradeResult' },
            worstTrade: { $ref: '#/components/schemas/TradeResult' },
          },
        },
      },
    },
  },
  apis: ['./src/api/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options); 