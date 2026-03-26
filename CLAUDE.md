# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WalletViz is a Polymarket wallet analytics dashboard. It collects trade data from Polymarket's public APIs into SQLite, runs statistical analysis, exports results as a JSON snapshot, and renders a static React dashboard. There are no API routes in production — the site is a fully static export served on GitHub Pages.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Full data collection (~8,700 events) | `npm run collect:full` |
| Incremental update (top 500 events) | `npm run collect:update` |
| Purge trades older than 35 days | `npm run collect:purge` |
| Print DB statistics | `npm run collect:stats` |
| Export snapshot JSON | `npm run export-snapshot` |

No test framework is configured.

## Architecture

**Two-phase pipeline:**

1. **Data collection** (`scripts/collect.ts`) → SQLite (`data/walletviz.db`)
   - Fetches events from Gamma API, trades from Data API (public, no auth)
   - Batch processing with 10-concurrent requests, exponential backoff
   - Deduplication via UNIQUE constraints, transaction-based inserts

2. **Analysis & export** (`scripts/export-snapshot.ts`) → `public/data/snapshot.json`
   - Bot filtering (wallets with >100 trades/day excluded)
   - Generates: size distribution, concentration, frequency, market breadth, buy/sell behavior, Gini coefficient & Lorenz curve

3. **Static frontend** (`src/app/page.tsx`) fetches snapshot.json on mount and renders charts client-side

**Key modules:**
- `src/lib/db.ts` — SQLite singleton (better-sqlite3, WAL mode)
- `src/lib/db-queries.ts` — All analysis queries and bot filtering logic
- `src/components/` — Recharts visualization wrappers (DistributionChart, ConcentrationChart, LorenzChart, StatsCard)

**Important quirk:** `export-snapshot.ts` duplicates analysis logic from `db-queries.ts` inline to avoid module resolution issues with the `tsx` runner. Changes to analysis logic must be applied in both places.

## Tech Stack

- **Framework:** Next.js 14 (App Router, static export via `output: "export"`)
- **Visualization:** Recharts
- **Database:** SQLite via better-sqlite3 (server/script-side only, externalized from webpack)
- **Styling:** Tailwind CSS (dark theme, slate/indigo/amber palette)
- **State:** React hooks only (useState/useEffect), no state library
- **Deployment:** GitHub Actions → GitHub Pages (base path `/WalletViz`)
- **Path alias:** `@/*` → `./src/*`

## Data Refresh

Daily cron runs full collection + purge at 3:07am UTC. After collection, run `npm run export-snapshot` then push to trigger deploy. See `docs/TECHNICAL.md` for scheduling details.
