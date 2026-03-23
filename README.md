# WalletViz

Visual analytics dashboard for Polymarket wallet data. Open source, built in public.

## What it does

Analyzes Polymarket wallet data through a filtering pipeline:

1. **Total Wallets** - All wallets from Polymarket leaderboard
2. **Remove Inactive** - Wallets with no trades in the last 30 days
3. **Remove Bots** - Wallets averaging >100 trades/day
4. **Active Wallets** - Remaining real traders

Results are visualized as a funnel chart with stats breakdown.

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Polymarket Data API** for wallet/trade data

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data Source

- Leaderboard: `GET https://data-api.polymarket.com/v1/leaderboard`
- Trades: `GET https://data-api.polymarket.com/trades?user={address}`

No API key required. Rate limit: 60 requests/min.

## License

MIT
