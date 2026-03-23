import { getDb } from "./db";

// --- Overview Stats ---

export interface OverviewStats {
  active30d: number;
  active7d: number;
  totalObserved: number;
  totalTrades: number;
  medianVolume30d: number;
  medianTrades30d: number;
  avgVolume30d: number;
  observationStart: number;
  observationEnd: number;
  daysWithData: number;
  lastSync: string | null;
}

export function queryOverview(): OverviewStats {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const day7 = now - 7 * 86400;
  const day30 = now - 30 * 86400;

  const totalObserved = (
    db.prepare("SELECT COUNT(DISTINCT proxy_wallet) as c FROM trades").get() as any
  ).c;

  const totalTrades = (
    db.prepare("SELECT COUNT(*) as c FROM trades").get() as any
  ).c;

  const active30d = (
    db.prepare(
      "SELECT COUNT(DISTINCT proxy_wallet) as c FROM trades WHERE timestamp >= ?"
    ).get(day30) as any
  ).c;

  const active7d = (
    db.prepare(
      "SELECT COUNT(DISTINCT proxy_wallet) as c FROM trades WHERE timestamp >= ?"
    ).get(day7) as any
  ).c;

  // Per-wallet stats for 30D active
  const walletStats30d = db
    .prepare(
      `SELECT proxy_wallet,
              SUM(size * price) as vol,
              COUNT(*) as trades
       FROM trades
       WHERE timestamp >= ?
       GROUP BY proxy_wallet
       ORDER BY vol`
    )
    .all(day30) as { proxy_wallet: string; vol: number; trades: number }[];

  let medianVol = 0;
  let medianTrades = 0;
  let avgVol = 0;

  if (walletStats30d.length > 0) {
    const mid = Math.floor(walletStats30d.length / 2);
    medianVol = walletStats30d[mid].vol;

    const sortedByTrades = [...walletStats30d].sort((a, b) => a.trades - b.trades);
    medianTrades = sortedByTrades[mid].trades;

    avgVol =
      walletStats30d.reduce((s, w) => s + w.vol, 0) / walletStats30d.length;
  }

  const timeRange = db
    .prepare("SELECT MIN(timestamp) as mn, MAX(timestamp) as mx FROM trades")
    .get() as any;

  const daysWithData = (
    db.prepare(
      "SELECT COUNT(DISTINCT date(timestamp, 'unixepoch')) as c FROM trades WHERE timestamp >= ?"
    ).get(day30) as any
  ).c;

  const lastSync = db
    .prepare("SELECT finished_at FROM sync_log ORDER BY id DESC LIMIT 1")
    .get() as any;

  return {
    active30d,
    active7d,
    totalObserved,
    totalTrades,
    medianVolume30d: medianVol,
    medianTrades30d: medianTrades,
    avgVolume30d: avgVol,
    observationStart: timeRange?.mn || 0,
    observationEnd: timeRange?.mx || 0,
    daysWithData,
    lastSync: lastSync?.finished_at || null,
  };
}

// --- Daily Activity ---

export interface DailyActivity {
  date: string;
  activeWallets: number;
  trades: number;
  volume: number;
}

export function queryDailyActivity(): DailyActivity[] {
  const db = getDb();
  const day30 = Math.floor(Date.now() / 1000) - 30 * 86400;

  return db
    .prepare(
      `SELECT date(timestamp, 'unixepoch') as date,
              COUNT(DISTINCT proxy_wallet) as activeWallets,
              COUNT(*) as trades,
              SUM(size * price) as volume
       FROM trades
       WHERE timestamp >= ?
       GROUP BY date(timestamp, 'unixepoch')
       ORDER BY date`
    )
    .all(day30) as DailyActivity[];
}

// --- Size Distribution (30D active) ---

export interface SizeBucket {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export function querySizeDistribution(): SizeBucket[] {
  const db = getDb();
  const day30 = Math.floor(Date.now() / 1000) - 30 * 86400;

  const walletVols = db
    .prepare(
      `SELECT SUM(size * price) as vol
       FROM trades
       WHERE timestamp >= ?
       GROUP BY proxy_wallet`
    )
    .all(day30) as { vol: number }[];

  const total = walletVols.length;
  const defs = [
    { label: "Micro (< $10)", from: 0, to: 10, color: "#94a3b8" },
    { label: "Small ($10–$100)", from: 10, to: 100, color: "#a78bfa" },
    { label: "Medium ($100–$1K)", from: 100, to: 1000, color: "#6366f1" },
    { label: "Large ($1K–$10K)", from: 1000, to: 10000, color: "#f59e0b" },
    { label: "Whale (> $10K)", from: 10000, to: Infinity, color: "#ef4444" },
  ];

  return defs.map((d) => {
    const count = walletVols.filter(
      (w) => w.vol >= d.from && w.vol < d.to
    ).length;
    return { label: d.label, count, pct: total > 0 ? count / total : 0, color: d.color };
  });
}

// --- Volume Concentration ---

export interface ConcentrationPoint {
  label: string;
  walletPct: number;
  volPct: number;
  color: string;
}

export function queryConcentration(): ConcentrationPoint[] {
  const db = getDb();
  const day30 = Math.floor(Date.now() / 1000) - 30 * 86400;

  const walletVols = db
    .prepare(
      `SELECT SUM(size * price) as vol
       FROM trades
       WHERE timestamp >= ?
       GROUP BY proxy_wallet
       ORDER BY vol DESC`
    )
    .all(day30) as { vol: number }[];

  const totalVol = walletVols.reduce((s, w) => s + w.vol, 0);
  const n = walletVols.length;

  const cuts = [
    { label: "Top 1%", pct: 0.01, color: "#ef4444" },
    { label: "Top 5%", pct: 0.05, color: "#f59e0b" },
    { label: "Top 10%", pct: 0.10, color: "#6366f1" },
    { label: "Top 25%", pct: 0.25, color: "#8b5cf6" },
    { label: "Top 50%", pct: 0.50, color: "#a78bfa" },
  ];

  return cuts.map((c) => {
    const count = Math.ceil(n * c.pct);
    const sliceVol = walletVols.slice(0, count).reduce((s, w) => s + w.vol, 0);
    return {
      label: c.label,
      walletPct: c.pct,
      volPct: totalVol > 0 ? sliceVol / totalVol : 0,
      color: c.color,
    };
  });
}

// --- Trade Frequency Distribution ---

export function queryFrequencyDistribution(): SizeBucket[] {
  const db = getDb();
  const day30 = Math.floor(Date.now() / 1000) - 30 * 86400;

  const walletTrades = db
    .prepare(
      `SELECT COUNT(*) as cnt
       FROM trades
       WHERE timestamp >= ?
       GROUP BY proxy_wallet`
    )
    .all(day30) as { cnt: number }[];

  const total = walletTrades.length;
  const defs = [
    { label: "1 trade", from: 1, to: 2, color: "#94a3b8" },
    { label: "2–5", from: 2, to: 6, color: "#a78bfa" },
    { label: "6–20", from: 6, to: 21, color: "#6366f1" },
    { label: "21–50", from: 21, to: 51, color: "#f59e0b" },
    { label: "51–100", from: 51, to: 101, color: "#f97316" },
    { label: "> 100", from: 101, to: Infinity, color: "#ef4444" },
  ];

  return defs.map((d) => {
    const count = walletTrades.filter(
      (w) => w.cnt >= d.from && w.cnt < d.to
    ).length;
    return { label: d.label, count, pct: total > 0 ? count / total : 0, color: d.color };
  });
}

// --- Market Breadth ---

export function queryMarketBreadth(): SizeBucket[] {
  const db = getDb();
  const day30 = Math.floor(Date.now() / 1000) - 30 * 86400;

  const walletMarkets = db
    .prepare(
      `SELECT COUNT(DISTINCT condition_id) as cnt
       FROM trades
       WHERE timestamp >= ?
       GROUP BY proxy_wallet`
    )
    .all(day30) as { cnt: number }[];

  const total = walletMarkets.length;
  const defs = [
    { label: "1 market", from: 1, to: 2, color: "#94a3b8" },
    { label: "2–3", from: 2, to: 4, color: "#a78bfa" },
    { label: "4–10", from: 4, to: 11, color: "#6366f1" },
    { label: "11–20", from: 11, to: 21, color: "#f59e0b" },
    { label: "> 20", from: 21, to: Infinity, color: "#ef4444" },
  ];

  return defs.map((d) => {
    const count = walletMarkets.filter(
      (w) => w.cnt >= d.from && w.cnt < d.to
    ).length;
    return { label: d.label, count, pct: total > 0 ? count / total : 0, color: d.color };
  });
}

// --- Buy/Sell Behavior ---

export interface BuySellStats {
  buyDominant: number;
  sellDominant: number;
  balanced: number;
  total: number;
}

export function queryBuySellStats(): BuySellStats {
  const db = getDb();
  const day30 = Math.floor(Date.now() / 1000) - 30 * 86400;

  const walletSides = db
    .prepare(
      `SELECT
         SUM(CASE WHEN side = 'BUY' THEN 1 ELSE 0 END) as buys,
         SUM(CASE WHEN side = 'SELL' THEN 1 ELSE 0 END) as sells
       FROM trades
       WHERE timestamp >= ?
       GROUP BY proxy_wallet`
    )
    .all(day30) as { buys: number; sells: number }[];

  let buyDom = 0,
    sellDom = 0,
    balanced = 0;

  for (const w of walletSides) {
    if (w.buys > w.sells * 1.5) buyDom++;
    else if (w.sells > w.buys * 1.5) sellDom++;
    else balanced++;
  }

  return { buyDominant: buyDom, sellDominant: sellDom, balanced, total: walletSides.length };
}
