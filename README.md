# WalletViz

**Quantitative analysis of Polymarket wallet behavior — updated daily.**

**[Live Dashboard](https://quantsarahz.github.io/WalletViz/)** · **[Technical Docs](docs/TECHNICAL.md)**

---

WalletViz collects trade data from every active Polymarket event, filters out bots, and visualizes how wallets actually behave — their size, frequency, concentration, and inequality. All numbers on the dashboard refresh daily.

## What the Dashboard Shows

- **Volume distribution** — micro, small, medium, large, whale breakdown
- **Concentration** — how much the top 1%, 5%, 10% dominate
- **Lorenz curve & Gini coefficient** — quantitative inequality measures
- **Trade frequency & market breadth** — how active and diversified wallets are
- **Buy vs sell behavior** — net buyer vs net seller classification

## Methodology

We collect the most recent 1,000 trades from each active event via Polymarket's public API, filter out bot wallets (>100 trades/day), and analyze the rest. Full scan runs daily.

This is activity-weighted — wallets that trade more are more likely to appear in the sample. It is a snapshot of observed activity, not a complete census.

## Quick Start

```bash
npm install
npm run collect:full    # Data collection (~15 min)
npm run export-snapshot # Export to static JSON
npm run dev             # Start dashboard
```

## License

MIT
