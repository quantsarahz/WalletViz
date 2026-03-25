import { getDb } from "./db";

/**
 * Bot threshold: wallets averaging > 100 trades/day are classified as bots.
 * Removes automated market makers, arbitrage bots, and other non-human actors.
 */
const BOT_DAILY_TRADE_THRESHOLD = 100;

// --- Bot wallet list (cached per process) ---

let _botWallets: Set<string> | null = null;

function getBotWallets(): Set<string> {
  if (_botWallets) return _botWallets;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT proxy_wallet, COUNT(*) as trades,
              MAX(timestamp) - MIN(timestamp) as span_sec
       FROM trades
       GROUP BY proxy_wallet
       HAVING (CAST(trades AS REAL) / MAX(CAST(span_sec AS REAL) / 86400.0, 1.0)) > ?`
    )
    .all(BOT_DAILY_TRADE_THRESHOLD) as { proxy_wallet: string }[];
  _botWallets = new Set(rows.map((r) => r.proxy_wallet));
  return _botWallets;
}

/** SQL fragment to exclude bot wallets. */
function botFilter(): string {
  const bots = getBotWallets();
  if (bots.size === 0) return "";
  // Use a subquery approach for clean SQL
  return `AND proxy_wallet NOT IN (
    SELECT proxy_wallet FROM trades
    GROUP BY proxy_wallet
    HAVING (CAST(COUNT(*) AS REAL) / MAX(CAST(MAX(timestamp) - MIN(timestamp) AS REAL) / 86400.0, 1.0)) > ${BOT_DAILY_TRADE_THRESHOLD}
  )`;
}

// --- Snapshot Overview ---

export interface SnapshotOverview {
  scannedAt: string;
  totalObservedWallets: number;
  botWallets: number;
  humanWallets: number;
  totalTrades: number;
  humanTrades: number;
  medianVolume: number;
  avgVolume: number;
  medianTrades: number;
  eventsScanned: number;
}

export function querySnapshotOverview(): SnapshotOverview {
  const db = getDb();
  const bots = getBotWallets();

  const totalWallets = (
    db.prepare("SELECT COUNT(DISTINCT proxy_wallet) as c FROM trades").get() as any
  ).c;

  const totalTrades = (
    db.prepare("SELECT COUNT(*) as c FROM trades").get() as any
  ).c;

  const eventsScanned = (
    db.prepare("SELECT COUNT(DISTINCT event_id) as c FROM trades").get() as any
  ).c;

  // Per-wallet stats for human wallets
  const humanPerWallet = db
    .prepare(
      `SELECT SUM(size * price) as vol, COUNT(*) as cnt
       FROM trades
       WHERE 1=1 ${botFilter()}
       GROUP BY proxy_wallet
       ORDER BY vol`
    )
    .all() as { vol: number; cnt: number }[];

  let medianVol = 0;
  let medianTrades = 0;
  let avgVol = 0;

  // Use humanPerWallet.length as the authoritative human wallet count
  const humanWallets = humanPerWallet.length;

  if (humanPerWallet.length > 0) {
    const mid = Math.floor(humanPerWallet.length / 2);
    medianVol = humanPerWallet[mid].vol;
    const sortedByTrades = [...humanPerWallet].sort((a, b) => a.cnt - b.cnt);
    medianTrades = sortedByTrades[mid].cnt;
    avgVol = humanPerWallet.reduce((s, w) => s + w.vol, 0) / humanPerWallet.length;
  }

  const lastSync = db
    .prepare("SELECT finished_at FROM sync_log ORDER BY id DESC LIMIT 1")
    .get() as any;

  const humanTradesCount = humanPerWallet.reduce((s, w) => s + w.cnt, 0);

  return {
    scannedAt: lastSync?.finished_at || new Date().toISOString(),
    totalObservedWallets: totalWallets,
    botWallets: totalWallets - humanWallets,
    humanWallets,
    totalTrades,
    humanTrades: humanTradesCount,
    medianVolume: medianVol,
    avgVolume: avgVol,
    medianTrades,
    eventsScanned,
  };
}

// --- Size Distribution (human wallets only) ---

export interface SizeBucket {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export function querySizeDistribution(): SizeBucket[] {
  const db = getDb();

  const walletVols = db
    .prepare(
      `SELECT SUM(size * price) as vol
       FROM trades
       WHERE 1=1 ${botFilter()}
       GROUP BY proxy_wallet`
    )
    .all() as { vol: number }[];

  const total = walletVols.length;
  const defs = [
    { label: "Micro (< $10)", from: 0, to: 10, color: "#94a3b8" },
    { label: "Small ($10–$100)", from: 10, to: 100, color: "#a78bfa" },
    { label: "Medium ($100–$1K)", from: 100, to: 1000, color: "#6366f1" },
    { label: "Large ($1K–$10K)", from: 1000, to: 10000, color: "#f59e0b" },
    { label: "Whale (> $10K)", from: 10000, to: Infinity, color: "#ef4444" },
  ];

  return defs.map((d) => {
    const count = walletVols.filter((w) => w.vol >= d.from && w.vol < d.to).length;
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

  const walletVols = db
    .prepare(
      `SELECT SUM(size * price) as vol
       FROM trades
       WHERE 1=1 ${botFilter()}
       GROUP BY proxy_wallet
       ORDER BY vol DESC`
    )
    .all() as { vol: number }[];

  const totalVol = walletVols.reduce((s, w) => s + w.vol, 0);
  const n = walletVols.length;

  return [
    { label: "Top 1%", pct: 0.01, color: "#ef4444" },
    { label: "Top 5%", pct: 0.05, color: "#f59e0b" },
    { label: "Top 10%", pct: 0.10, color: "#6366f1" },
    { label: "Top 25%", pct: 0.25, color: "#8b5cf6" },
    { label: "Top 50%", pct: 0.50, color: "#a78bfa" },
  ].map((c) => {
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

  const walletTrades = db
    .prepare(
      `SELECT COUNT(*) as cnt
       FROM trades
       WHERE 1=1 ${botFilter()}
       GROUP BY proxy_wallet`
    )
    .all() as { cnt: number }[];

  const total = walletTrades.length;
  const defs = [
    { label: "1 trade", from: 1, to: 2, color: "#94a3b8" },
    { label: "2–5", from: 2, to: 6, color: "#a78bfa" },
    { label: "6–20", from: 6, to: 21, color: "#6366f1" },
    { label: "21–50", from: 21, to: 51, color: "#f59e0b" },
    { label: "51–200", from: 51, to: 201, color: "#f97316" },
    { label: "> 200", from: 201, to: Infinity, color: "#ef4444" },
  ];

  return defs.map((d) => {
    const count = walletTrades.filter((w) => w.cnt >= d.from && w.cnt < d.to).length;
    return { label: d.label, count, pct: total > 0 ? count / total : 0, color: d.color };
  });
}

// --- Market Breadth ---

export function queryMarketBreadth(): SizeBucket[] {
  const db = getDb();

  const walletMarkets = db
    .prepare(
      `SELECT COUNT(DISTINCT condition_id) as cnt
       FROM trades
       WHERE 1=1 ${botFilter()}
       GROUP BY proxy_wallet`
    )
    .all() as { cnt: number }[];

  const total = walletMarkets.length;
  const defs = [
    { label: "1 market", from: 1, to: 2, color: "#94a3b8" },
    { label: "2–3", from: 2, to: 4, color: "#a78bfa" },
    { label: "4–10", from: 4, to: 11, color: "#6366f1" },
    { label: "11–20", from: 11, to: 21, color: "#f59e0b" },
    { label: "> 20", from: 21, to: Infinity, color: "#ef4444" },
  ];

  return defs.map((d) => {
    const count = walletMarkets.filter((w) => w.cnt >= d.from && w.cnt < d.to).length;
    return { label: d.label, count, pct: total > 0 ? count / total : 0, color: d.color };
  });
}

// --- Gini Coefficient & Lorenz Curve ---

export interface GiniData {
  giniVolume: number;
  giniTrades: number;
  lorenz: { cumWalletPct: number; cumVolPct: number }[];
}

export function queryGini(): GiniData {
  const db = getDb();

  const walletVols = db
    .prepare(
      `SELECT SUM(size * price) as vol, COUNT(*) as cnt
       FROM trades
       WHERE 1=1 ${botFilter()}
       GROUP BY proxy_wallet
       ORDER BY vol ASC`
    )
    .all() as { vol: number; cnt: number }[];

  const n = walletVols.length;
  const totalVol = walletVols.reduce((s, w) => s + w.vol, 0);
  const totalTrades = walletVols.reduce((s, w) => s + w.cnt, 0);

  // Gini for volume
  let giniVolSum = 0;
  for (let i = 0; i < n; i++) {
    giniVolSum += (2 * (i + 1) - n - 1) * walletVols[i].vol;
  }
  const giniVolume = n > 0 && totalVol > 0 ? giniVolSum / (n * totalVol) : 0;

  // Gini for trades
  const sortedByTrades = [...walletVols].sort((a, b) => a.cnt - b.cnt);
  let giniTradeSum = 0;
  for (let i = 0; i < n; i++) {
    giniTradeSum += (2 * (i + 1) - n - 1) * sortedByTrades[i].cnt;
  }
  const giniTrades = n > 0 && totalTrades > 0 ? giniTradeSum / (n * totalTrades) : 0;

  // Lorenz curve (20 points)
  const lorenz: { cumWalletPct: number; cumVolPct: number }[] = [
    { cumWalletPct: 0, cumVolPct: 0 },
  ];
  let cumVol = 0;
  const step = Math.max(Math.floor(n / 20), 1);
  for (let i = 0; i < n; i++) {
    cumVol += walletVols[i].vol;
    if ((i + 1) % step === 0 || i === n - 1) {
      lorenz.push({
        cumWalletPct: (i + 1) / n,
        cumVolPct: cumVol / totalVol,
      });
    }
  }

  return { giniVolume, giniTrades, lorenz };
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

  const walletSides = db
    .prepare(
      `SELECT
         SUM(CASE WHEN side = 'BUY' THEN 1 ELSE 0 END) as buys,
         SUM(CASE WHEN side = 'SELL' THEN 1 ELSE 0 END) as sells
       FROM trades
       WHERE 1=1 ${botFilter()}
       GROUP BY proxy_wallet`
    )
    .all() as { buys: number; sells: number }[];

  let buyDom = 0, sellDom = 0, balanced = 0;
  for (const w of walletSides) {
    if (w.buys > w.sells * 1.5) buyDom++;
    else if (w.sells > w.buys * 1.5) sellDom++;
    else balanced++;
  }

  return { buyDominant: buyDom, sellDominant: sellDom, balanced, total: walletSides.length };
}
