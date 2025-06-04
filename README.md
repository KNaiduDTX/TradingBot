# Solana Trading Bot 🤖

A high-performance, ML-powered trading bot for Solana tokens with advanced risk management and monitoring capabilities.

## 🚀 Features

- **ML-Powered Trading**: Uses ONNX models for trade signal generation
- **Risk Management**: Advanced position sizing and risk metrics
- **Real-time Monitoring**: Prometheus metrics and Grafana dashboards
- **Resilient Architecture**: Circuit breaker and retry queue for reliability
- **Comprehensive Logging**: Structured logging with Winston
- **Database Persistence**: SQLite for trade and performance tracking

## 📋 Prerequisites

- Node.js >= 16.x
- Solana CLI tools
- Docker & Docker Compose (for containerized deployment)
- PM2 (for process management)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/solana-trading-bot.git
cd solana-trading-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp configs/.env.example .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

## 🏗️ Project Structure

```
├── configs/           # Configuration files
│   ├── .env          # Environment variables
│   ├── risk.ts       # Risk management config
│   ├── trading.ts    # Trading strategy config
│   └── monitoring.ts # Monitoring and alerts config
├── data/             # Database and data files
├── dashboard/        # Grafana dashboards
├── models/           # ML model artifacts
├── notebooks/        # Jupyter notebooks for analysis
├── src/             # Source code
│   ├── commands/    # Trading commands
│   ├── lib/         # Core utilities
│   ├── monitoring/  # Monitoring setup
│   └── types/       # TypeScript types
├── tests/           # Test files
└── docker/          # Docker configuration
```

## ⚙️ Configuration

### Environment Variables

The bot requires several environment variables to be set in the `.env` file:

#### Network Configuration
- `SOLANA_RPC_URL`: Solana RPC endpoint
- `SOLANA_WS_URL`: Solana WebSocket endpoint
- `NETWORK`: Network to use (mainnet-beta, testnet, devnet)

#### API Keys
- `HELIUS_API_KEY`: Helius API key for enhanced RPC
- `PYTH_API_KEY`: Pyth Network API key
- `SWITCHBOARD_API_KEY`: Switchboard API key

#### Trading Parameters
- `MAX_POSITION_SIZE`: Maximum position size in SOL
- `MIN_LIQUIDITY_USD`: Minimum liquidity in USD
- `MAX_SLIPPAGE_BPS`: Maximum allowed slippage in basis points

#### Risk Management
- `MAX_DRAWDOWN`: Maximum allowed drawdown
- `DAILY_LOSS_LIMIT`: Maximum daily loss limit
- `STOP_LOSS_PERCENTAGE`: Stop loss percentage

### Configuration Files

#### Risk Management (`configs/risk.ts`)
- Position limits and sizing
- Risk thresholds
- Circuit breakers
- Market risk parameters

#### Trading Strategy (`configs/trading.ts`)
- Strategy parameters
- Entry/exit rules
- Technical indicators
- Position sizing rules

#### Monitoring (`configs/monitoring.ts`)
- Alerting configuration
- Logging settings
- Performance metrics
- Health checks

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run start
```

### Docker Deployment
```bash
docker-compose up -d
```

## 📊 Monitoring

### Prometheus Metrics
- Trade execution metrics
- Performance metrics
- System health metrics

### Grafana Dashboards
- Real-time trading dashboard
- Performance analytics
- System monitoring

### Telegram Alerts
- Trade execution alerts
- Error notifications
- Performance alerts

## 🔒 Security

- API keys and secrets management
- Wallet security
- Transaction signing security
- Rate limiting and circuit breakers

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance
```

## 📈 Performance

- Optimized for low latency
- Efficient memory usage
- Scalable architecture
- Real-time data processing

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is for educational purposes only. Use at your own risk. The authors are not responsible for any financial losses incurred through the use of this software. 