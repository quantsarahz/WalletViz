# Technical Documentation

## Architecture

- **Next.js 14** (App Router, TypeScript) — web dashboard
- **SQLite** (better-sqlite3) — persistent trade storage
- **Tailwind CSS** — styling
- **Recharts** — data visualization
- **Polymarket Data API + Gamma API** — trade and event data

## Data Collection

### How it works

1. Fetch all active events from Gamma API (~8,700 events)
2. For each event, collect the most recent 1,000 trades via Data API
3. Store in SQLite with deduplication
4. Bot filtering: wallets averaging >50 trades/day are excluded (~0.3%)
5. API route reads from SQLite — sub-second response

### Commands

```bash
npm run collect:full    # Full scan: all active events (~15 min)
npm run collect:update  # Incremental: top 500 events (<1 min)
npm run collect:purge   # Remove trades older than 35 days
npm run collect:stats   # Print database stats
```

### Scheduling

Recommended cron setup:

```
# Daily incremental update at 3:07am
7 3 * * * /path/to/node npx tsx /path/to/scripts/collect.ts update

# Weekly full scan + purge on Monday at 4:07am
7 4 * * 1 /path/to/node npx tsx /path/to/scripts/collect.ts full && npx tsx /path/to/scripts/collect.ts purge
```

## Data Source

- Events: `GET https://gamma-api.polymarket.com/events`
- Trades: `GET https://data-api.polymarket.com/trades?eventId={id}&limit=1000`

No API key required. Public endpoints.

## Methodology & Limitations

Each event only yields its latest 1,000 trades. High-volume events cover hours; low-volume events cover weeks. This produces a representative cross-sectional snapshot, not a complete census. The true number of active wallets is likely higher than what we observe.

Bot detection uses a simple frequency threshold (>50 trades/day average). This catches most automated traders but may miss sophisticated bots or falsely flag very active human traders.
