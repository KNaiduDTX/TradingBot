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

The bot exposes Prometheus metrics on port 9090 by default. Access the Grafana dashboard at `http://localhost:3000` (default credentials: admin/admin).

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration
```

## 🔧 Configuration

Key configuration parameters in `configs/config.ts`:

- Network settings (RPC endpoints)
- Trading parameters (position sizes, thresholds)
- Risk management settings
- Monitoring configuration
- API keys and model settings

## 📈 Performance Metrics

The bot tracks:
- Total PnL
- Win rate
- Average trade duration
- Best/worst trades
- System metrics (CPU, memory, etc.)

## 🔐 Security

- API keys stored in environment variables
- Rate limiting on external API calls
- Input validation and sanitization
- Regular security audits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This software is for educational purposes only. Use at your own risk. The authors are not responsible for any financial losses incurred through the use of this software. 