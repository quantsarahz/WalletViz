# WalletViz

**See who's actually trading on Polymarket.**

**[Live Dashboard](https://quantsarahz.github.io/WalletViz/)**

WalletViz scans every active market on Polymarket and maps out the wallet landscape — how many traders there are, how big they are, and how they behave.

## Key Findings

- **205K+ human wallets** observed (bots filtered)
- **71% are small traders** (under $100 in observed volume)
- **Less than 1% are whales** (over $10K)
- **Gini coefficient of 0.91** — extreme volume concentration, comparable to global wealth inequality
- Most wallets trade in only one market — event-driven, not habitual

## What You'll See

- **Wallet size distribution** — micro, small, medium, large, whale
- **Trade frequency** — how often people trade
- **Market participation** — how many markets each wallet touches
- **Buy vs sell behavior** — who's buying, who's selling
- **Volume concentration** — how much the top traders dominate
- **Lorenz curve & Gini coefficient** — quantitative inequality measures

## How It Works

We collect the most recent 1,000 trades from each of ~8,700 active events, filter out bots (>100 trades/day), and analyze what's left. Full scan runs daily.

> This is a snapshot of observed activity, not a complete census. We show the full picture — including the long tail of small traders that most analytics miss.

## For Developers

```bash
npm install
npm run collect:full    # First-time data collection (~15 min)
npm run export-snapshot # Export data for static site
npm run dev             # Start the dashboard
```

See the full [technical documentation](docs/TECHNICAL.md) for architecture details.

## License

MIT — free to use, fork, and build upon.
