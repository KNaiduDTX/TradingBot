# 🚀 Solana Memecoin Trading Bot

A high-performance trading bot for Solana memecoins with Cursor integration.

## 📁 Project Structure

```
.
├── data/               # Raw and cleaned datasets
├── notebooks/         # Exploratory analysis
├── models/           # Trained model artifacts
├── src/              # Core bot logic
│   ├── commands/     # Bot command modules
│   ├── lib/          # Shared utilities
│   └── api/          # API endpoints
├── configs/          # Configuration files
├── tests/            # Test suite
└── dashboard/        # React dashboard UI
```

## 🛠️ Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Solana credentials
```

3. Start the bot:
```bash
npm run start
```

## 🔒 Security

- Never commit API keys or wallet seeds
- Use environment variables for sensitive data
- Enable 2FA for all accounts

## 📊 Dashboard

Access the trading dashboard at `http://localhost:3000` after starting the bot.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE.md for details 