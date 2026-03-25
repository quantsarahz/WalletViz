# Technical Documentation

## Architecture

- **Next.js 14** (App Router, TypeScript) — web dashboard
- **SQLite** (better-sqlite3) — persistent trade storage
- **Tailwind CSS** — styling
- **Recharts** — data visualization (bar charts, Lorenz curve)
- **Polymarket Data API + Gamma API** — trade and event data

## Data Collection

### How it works

1. Fetch all active events from Gamma API (~8,700 events)
2. For each event, collect the most recent 1,000 trades via Data API
3. Store in SQLite with deduplication (INSERT OR IGNORE)
4. Purge trades older than 35 days
5. Export snapshot JSON for static site deployment

### Commands

```bash
npm run collect:full    # Full scan: all active events (~15 min)
npm run collect:update  # Incremental: top 500 events (<1 min)
npm run collect:purge   # Remove trades older than 35 days
npm run collect:stats   # Print database stats
npm run export-snapshot # Export static JSON for deployment
```

### Scheduling

Daily full scan + purge at 3:07am:

```
7 3 * * * /path/to/node npx tsx /path/to/scripts/collect.ts full && npx tsx /path/to/scripts/collect.ts purge
```

Full daily scans ensure consistent coverage across days, enabling reliable day-over-day comparison as data accumulates.

### Deployment

Static export to GitHub Pages:

```bash
npm run export-snapshot   # Generate public/data/snapshot.json
git add -A && git commit -m "data: update" && git push
# GitHub Actions auto-deploys to Pages
```

## Data Source

- Events: `GET https://gamma-api.polymarket.com/events`
- Trades: `GET https://data-api.polymarket.com/trades?eventId={id}&limit=1000`

No API key required. Public endpoints.

## Methodology & Limitations

**Snapshot approach:** Each event yields its latest 1,000 trades. High-volume events cover hours; low-volume events cover weeks. This is a cross-sectional snapshot, not a complete census. The true number of active wallets is likely higher.

**Activity-weighted:** Wallets with higher trading frequency appear more prominently. Volume figures are observed within the sample, not lifetime totals. Treat as lower-bound estimates.

**Bot filtering:** Wallets averaging >100 trades/day are excluded. This catches most automated traders but may miss sophisticated bots or falsely flag very active humans.

**Gini coefficient:** Calculated on observed volume distribution. The extreme value (0.91) reflects both genuine market inequality and sampling bias toward active traders.
