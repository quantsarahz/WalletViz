/**
 * Export current SQLite data as static JSON for Vercel deployment.
 *
 * Usage: npx tsx scripts/export-snapshot.ts
 * Output: public/data/snapshot.json
 */

import fs from "fs";
import path from "path";

// Import db-queries by requiring the compiled module directly
// Since we're running via tsx, we can import TS files
const DB_PATH = path.join(
  path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
  "data",
  "walletviz.db"
);

// Inline the queries to avoid Next.js module resolution issues
import Database from "better-sqlite3";

const BOT_DAILY_TRADE_THRESHOLD = 50;

function run() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  const botFilterSQL = `AND proxy_wallet NOT IN (
    SELECT proxy_wallet FROM trades
    GROUP BY proxy_wallet
    HAVING (CAST(COUNT(*) AS REAL) / MAX(CAST(MAX(timestamp) - MIN(timestamp) AS REAL) / 86400.0, 1.0)) > ${BOT_DAILY_TRADE_THRESHOLD}
  )`;

  // Overview
  const totalWallets = (db.prepare("SELECT COUNT(DISTINCT proxy_wallet) as c FROM trades").get() as any).c;
  const totalTrades = (db.prepare("SELECT COUNT(*) as c FROM trades").get() as any).c;
  const eventsScanned = (db.prepare("SELECT COUNT(DISTINCT event_id) as c FROM trades").get() as any).c;
  const botCount = (db.prepare(`SELECT COUNT(*) as c FROM (
    SELECT proxy_wallet FROM trades GROUP BY proxy_wallet
    HAVING (CAST(COUNT(*) AS REAL) / MAX(CAST(MAX(timestamp) - MIN(timestamp) AS REAL) / 86400.0, 1.0)) > ${BOT_DAILY_TRADE_THRESHOLD}
  )`).get() as any).c;
  const humanWallets = totalWallets - botCount;
  const humanTrades = (db.prepare(`SELECT COUNT(*) as c FROM trades WHERE 1=1 ${botFilterSQL}`).get() as any).c;

  const humanPerWallet = db.prepare(
    `SELECT SUM(size * price) as vol, COUNT(*) as cnt FROM trades WHERE 1=1 ${botFilterSQL} GROUP BY proxy_wallet ORDER BY vol`
  ).all() as { vol: number; cnt: number }[];

  const mid = Math.floor(humanPerWallet.length / 2);
  const medianVol = humanPerWallet.length > 0 ? humanPerWallet[mid].vol : 0;
  const sortedByTrades = [...humanPerWallet].sort((a, b) => a.cnt - b.cnt);
  const medianTrades = humanPerWallet.length > 0 ? sortedByTrades[mid].cnt : 0;
  const avgVol = humanPerWallet.length > 0 ? humanPerWallet.reduce((s, w) => s + w.vol, 0) / humanPerWallet.length : 0;

  const lastSync = db.prepare("SELECT finished_at FROM sync_log ORDER BY id DESC LIMIT 1").get() as any;

  const overview = {
    scannedAt: lastSync?.finished_at || new Date().toISOString(),
    totalObservedWallets: totalWallets,
    botWallets: botCount,
    humanWallets,
    totalTrades,
    humanTrades,
    medianVolume: medianVol,
    avgVolume: avgVol,
    medianTrades,
    eventsScanned,
  };

  // Size distribution
  const walletVols = db.prepare(
    `SELECT SUM(size * price) as vol FROM trades WHERE 1=1 ${botFilterSQL} GROUP BY proxy_wallet`
  ).all() as { vol: number }[];

  const sizeDefs = [
    { label: "Micro (< $10)", from: 0, to: 10, color: "#94a3b8" },
    { label: "Small ($10–$100)", from: 10, to: 100, color: "#a78bfa" },
    { label: "Medium ($100–$1K)", from: 100, to: 1000, color: "#6366f1" },
    { label: "Large ($1K–$10K)", from: 1000, to: 10000, color: "#f59e0b" },
    { label: "Whale (> $10K)", from: 10000, to: Infinity, color: "#ef4444" },
  ];
  const total = walletVols.length;
  const sizeDistribution = sizeDefs.map((d) => {
    const count = walletVols.filter((w) => w.vol >= d.from && w.vol < d.to).length;
    return { label: d.label, count, pct: total > 0 ? count / total : 0, color: d.color };
  });

  // Concentration
  const sortedVols = [...walletVols].sort((a, b) => b.vol - a.vol);
  const totalVol = sortedVols.reduce((s, w) => s + w.vol, 0);
  const concentration = [
    { label: "Top 1%", pct: 0.01, color: "#ef4444" },
    { label: "Top 5%", pct: 0.05, color: "#f59e0b" },
    { label: "Top 10%", pct: 0.10, color: "#6366f1" },
    { label: "Top 25%", pct: 0.25, color: "#8b5cf6" },
    { label: "Top 50%", pct: 0.50, color: "#a78bfa" },
  ].map((c) => {
    const count = Math.ceil(total * c.pct);
    const sliceVol = sortedVols.slice(0, count).reduce((s, w) => s + w.vol, 0);
    return { label: c.label, walletPct: c.pct, volPct: totalVol > 0 ? sliceVol / totalVol : 0, color: c.color };
  });

  // Frequency distribution
  const walletTrades = db.prepare(
    `SELECT COUNT(*) as cnt FROM trades WHERE 1=1 ${botFilterSQL} GROUP BY proxy_wallet`
  ).all() as { cnt: number }[];
  const freqDefs = [
    { label: "1 trade", from: 1, to: 2, color: "#94a3b8" },
    { label: "2–5", from: 2, to: 6, color: "#a78bfa" },
    { label: "6–20", from: 6, to: 21, color: "#6366f1" },
    { label: "21–50", from: 21, to: 51, color: "#f59e0b" },
    { label: "51–200", from: 51, to: 201, color: "#f97316" },
    { label: "> 200", from: 201, to: Infinity, color: "#ef4444" },
  ];
  const frequencyDistribution = freqDefs.map((d) => {
    const count = walletTrades.filter((w) => w.cnt >= d.from && w.cnt < d.to).length;
    return { label: d.label, count, pct: total > 0 ? count / total : 0, color: d.color };
  });

  // Market breadth
  const walletMarkets = db.prepare(
    `SELECT COUNT(DISTINCT condition_id) as cnt FROM trades WHERE 1=1 ${botFilterSQL} GROUP BY proxy_wallet`
  ).all() as { cnt: number }[];
  const breadthDefs = [
    { label: "1 market", from: 1, to: 2, color: "#94a3b8" },
    { label: "2–3", from: 2, to: 4, color: "#a78bfa" },
    { label: "4–10", from: 4, to: 11, color: "#6366f1" },
    { label: "11–20", from: 11, to: 21, color: "#f59e0b" },
    { label: "> 20", from: 21, to: Infinity, color: "#ef4444" },
  ];
  const marketBreadth = breadthDefs.map((d) => {
    const count = walletMarkets.filter((w) => w.cnt >= d.from && w.cnt < d.to).length;
    return { label: d.label, count, pct: total > 0 ? count / total : 0, color: d.color };
  });

  // Buy/Sell
  const walletSides = db.prepare(
    `SELECT SUM(CASE WHEN side='BUY' THEN 1 ELSE 0 END) as buys, SUM(CASE WHEN side='SELL' THEN 1 ELSE 0 END) as sells
     FROM trades WHERE 1=1 ${botFilterSQL} GROUP BY proxy_wallet`
  ).all() as { buys: number; sells: number }[];
  let buyDom = 0, sellDom = 0, balanced = 0;
  for (const w of walletSides) {
    if (w.buys > w.sells * 1.5) buyDom++;
    else if (w.sells > w.buys * 1.5) sellDom++;
    else balanced++;
  }

  // Gini coefficient & Lorenz curve
  const walletVolsAsc = [...walletVols].sort((a, b) => a.vol - b.vol);
  const n = walletVolsAsc.length;
  const giniTotalVol = walletVolsAsc.reduce((s, w) => s + w.vol, 0);
  let giniVolSum = 0;
  for (let i = 0; i < n; i++) {
    giniVolSum += (2 * (i + 1) - n - 1) * walletVolsAsc[i].vol;
  }
  const giniVolume = n > 0 && giniTotalVol > 0 ? giniVolSum / (n * giniTotalVol) : 0;

  const walletTradesAsc = [...walletTrades].sort((a, b) => a.cnt - b.cnt);
  const totalTradesNum = walletTradesAsc.reduce((s, w) => s + w.cnt, 0);
  let giniTradeSum = 0;
  for (let i = 0; i < n; i++) {
    giniTradeSum += (2 * (i + 1) - n - 1) * (walletTradesAsc[i]?.cnt || 0);
  }
  const giniTrades = n > 0 && totalTradesNum > 0 ? giniTradeSum / (n * totalTradesNum) : 0;

  const lorenz: { cumWalletPct: number; cumVolPct: number }[] = [{ cumWalletPct: 0, cumVolPct: 0 }];
  let cumVol = 0;
  const step = Math.max(Math.floor(n / 20), 1);
  for (let i = 0; i < n; i++) {
    cumVol += walletVolsAsc[i].vol;
    if ((i + 1) % step === 0 || i === n - 1) {
      lorenz.push({ cumWalletPct: (i + 1) / n, cumVolPct: cumVol / giniTotalVol });
    }
  }

  const snapshot = {
    overview,
    sizeDistribution,
    concentration,
    frequencyDistribution,
    marketBreadth,
    buySell: { buyDominant: buyDom, sellDominant: sellDom, balanced, total: walletSides.length },
    gini: { giniVolume, giniTrades, lorenz },
  };

  // Write
  const outDir = path.join(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), "public", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "snapshot.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`Exported snapshot to ${outPath}`);
  console.log(`  Human wallets: ${humanWallets.toLocaleString()}`);
  console.log(`  File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);

  db.close();
}

run();
