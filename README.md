# WalletViz

**See who's actually trading on Polymarket.**

WalletViz scans the entire Polymarket platform and maps out the wallet landscape — how many traders there are, how big they are, and how they behave.

## Key Findings

- **176K+ real wallets** identified (bots removed)
- **71% are small traders** (under $100 in volume)
- **Less than 1% are whales** (over $10K)
- The top 1% of wallets control the majority of trading volume

## What You'll See

- **Wallet size breakdown** — micro, small, medium, large, whale
- **Trading frequency** — how often people trade
- **Market participation** — how many markets each wallet touches
- **Buy vs sell behavior** — who's buying, who's selling
- **Volume concentration** — how much the top traders dominate

## How It Works

We collect trade data from every active market on Polymarket (~8,700 events), filter out bots, and analyze what's left. Data refreshes daily.

> This is a snapshot of the ecosystem, not a leaderboard. We show the full picture — including the long tail of small traders that most analytics miss.

## For Developers

```bash
npm install
npm run collect:full    # First-time data collection (~15 min)
npm run dev             # Start the dashboard
```

See the full [technical documentation](docs/TECHNICAL.md) for architecture details.

## License

MIT — free to use, fork, and build upon.
