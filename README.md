# WalletViz

Cross-sectional snapshot of the Polymarket wallet ecosystem. Open source, built in public.

## What it does

Scans all active Polymarket events (~8,700), collects recent trades, and builds a structural analysis of the wallet landscape:

- **176K+ human wallets** observed (bots filtered)
- Wallet size distribution (micro / small / medium / large / whale)
- Trade frequency and market participation breadth
- Volume concentration (Pareto analysis)
- Buy vs sell behavior patterns

This is a **point-in-time snapshot**, not a time series. It answers: "Right now, what does the Polymarket wallet ecosystem look like?"

## Methodology

1. Collect the most recent 1,000 trades from each active event via Polymarket Data API
2. Deduplicate wallets across all events
3. Filter bots: wallets averaging >50 trades/day are excluded (~0.3%)
4. Analyze distributions across remaining human wallets

**Limitations:** Each event only yields its latest 1,000 trades. High-volume events cover hours; low-volume events cover weeks. This is a representative snapshot, not a complete census. The true number of active wallets is likely higher.

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **SQLite** (better-sqlite3) for persistent trade storage
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Polymarket Data API** + **Gamma API** for trade/event data

## Getting Started

```bash
npm install

# Initial data collection (full scan, ~15 min)
npm run collect:full

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data Collection

```bash
npm run collect:full    # Full scan: all ~8,700 active events
npm run collect:update  # Incremental: top 500 events by volume
npm run collect:purge   # Remove trades older than 35 days
npm run collect:stats   # Print database stats
```

Data is stored in `data/walletviz.db` (SQLite). Recommended: run `collect:update` daily and `collect:full` weekly via cron.

## Data Source

- Events: `GET https://gamma-api.polymarket.com/events`
- Trades: `GET https://data-api.polymarket.com/trades?eventId={id}`

No API key required. Public endpoints.

## License

MIT
