import type { RawTrade } from "./polymarket";

// --- Core Types ---

export interface WalletProfile {
  address: string;
  firstSeen: number; // earliest trade timestamp in our sample
  lastSeen: number;  // latest trade timestamp in our sample
  tradeCount: number;
  totalVolume: number;
  buyCount: number;
  sellCount: number;
  marketCount: number;
  markets: Set<string>;
}

// --- Build wallet profiles from raw trades ---

export function buildWalletProfiles(trades: RawTrade[]): Map<string, WalletProfile> {
  const wallets = new Map<string, WalletProfile>();

  for (const t of trades) {
    const addr = t.proxyWallet;
    const ts = t.timestamp;
    const vol = parseFloat(t.size) * parseFloat(t.price);

    let w = wallets.get(addr);
    if (!w) {
      w = {
        address: addr,
        firstSeen: ts,
        lastSeen: ts,
        tradeCount: 0,
        totalVolume: 0,
        buyCount: 0,
        sellCount: 0,
        marketCount: 0,
        markets: new Set(),
      };
      wallets.set(addr, w);
    }

    w.firstSeen = Math.min(w.firstSeen, ts);
    w.lastSeen = Math.max(w.lastSeen, ts);
    w.tradeCount++;
    w.totalVolume += vol;
    if (t.side === "BUY") w.buyCount++;
    else w.sellCount++;
    w.markets.add(t.conditionId);
  }

  for (const w of wallets.values()) {
    w.marketCount = w.markets.size;
  }

  return wallets;
}

// --- Filter wallets by time window ---

function filterByWindow(
  wallets: Map<string, WalletProfile>,
  windowStart: number
): WalletProfile[] {
  return Array.from(wallets.values()).filter((w) => w.lastSeen >= windowStart);
}

// --- Overview Stats ---

export interface OverviewStats {
  active30d: number;
  active7d: number;
  totalObserved: number;
  totalTrades: number;
  observationStart: number;
  observationEnd: number;
  // 30D cohort stats
  medianVolume30d: number;
  medianTrades30d: number;
  avgVolume30d: number;
  daysWithData: number;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function buildOverview(
  wallets: Map<string, WalletProfile>,
  trades: RawTrade[]
): OverviewStats {
  const profiles = Array.from(wallets.values());
  const now = Math.max(...profiles.map((w) => w.lastSeen));
  const day7 = now - 7 * 86400;
  const day30 = now - 30 * 86400;

  const active30d = filterByWindow(wallets, day30);
  const active7d = filterByWindow(wallets, day7);

  // Count days with trade data
  const daysWithData = new Set(
    trades.map((t) => {
      const d = new Date(t.timestamp * 1000);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  ).size;

  return {
    active30d: active30d.length,
    active7d: active7d.length,
    totalObserved: profiles.length,
    totalTrades: trades.length,
    observationStart: Math.min(...profiles.map((w) => w.firstSeen)),
    observationEnd: now,
    medianVolume30d: median(active30d.map((w) => w.totalVolume)),
    medianTrades30d: median(active30d.map((w) => w.tradeCount)),
    avgVolume30d:
      active30d.length > 0
        ? active30d.reduce((s, w) => s + w.totalVolume, 0) / active30d.length
        : 0,
    daysWithData,
  };
}

// --- Daily Active Wallets (time series) ---

export interface DailyActivity {
  date: string;
  activeWallets: number;
  trades: number;
  volume: number;
}

export function buildDailyActivity(trades: RawTrade[]): DailyActivity[] {
  const dayMap = new Map<
    string,
    { wallets: Set<string>; trades: number; volume: number }
  >();

  for (const t of trades) {
    const d = new Date(t.timestamp * 1000);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const vol = parseFloat(t.size) * parseFloat(t.price);

    if (!dayMap.has(day)) {
      dayMap.set(day, { wallets: new Set(), trades: 0, volume: 0 });
    }
    const entry = dayMap.get(day)!;
    entry.wallets.add(t.proxyWallet);
    entry.trades++;
    entry.volume += vol;
  }

  return Array.from(dayMap.keys())
    .sort()
    .map((day) => {
      const entry = dayMap.get(day)!;
      return {
        date: day,
        activeWallets: entry.wallets.size,
        trades: entry.trades,
        volume: entry.volume,
      };
    });
}

// --- Wallet Size Distribution (based on 30D active wallets) ---

export interface SizeBucket {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export function buildSizeDistribution(
  wallets: Map<string, WalletProfile>,
  windowStart: number
): SizeBucket[] {
  const active = filterByWindow(wallets, windowStart);
  const total = active.length;

  const defs = [
    { label: "Micro (< $10)", from: 0, to: 10, color: "#94a3b8" },
    { label: "Small ($10–$100)", from: 10, to: 100, color: "#a78bfa" },
    { label: "Medium ($100–$1K)", from: 100, to: 1000, color: "#6366f1" },
    { label: "Large ($1K–$10K)", from: 1000, to: 10000, color: "#f59e0b" },
    { label: "Whale (> $10K)", from: 10000, to: Infinity, color: "#ef4444" },
  ];

  return defs.map((d) => {
    const count = active.filter(
      (w) => w.totalVolume >= d.from && w.totalVolume < d.to
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

export function buildConcentration(
  wallets: Map<string, WalletProfile>,
  windowStart: number
): ConcentrationPoint[] {
  const active = filterByWindow(wallets, windowStart).sort(
    (a, b) => b.totalVolume - a.totalVolume
  );
  const totalVol = active.reduce((s, w) => s + w.totalVolume, 0);
  const n = active.length;

  const cuts = [
    { label: "Top 1%", pct: 0.01, color: "#ef4444" },
    { label: "Top 5%", pct: 0.05, color: "#f59e0b" },
    { label: "Top 10%", pct: 0.10, color: "#6366f1" },
    { label: "Top 25%", pct: 0.25, color: "#8b5cf6" },
    { label: "Top 50%", pct: 0.50, color: "#a78bfa" },
  ];

  return cuts.map((c) => {
    const count = Math.ceil(n * c.pct);
    const sliceVol = active.slice(0, count).reduce((s, w) => s + w.totalVolume, 0);
    return {
      label: c.label,
      walletPct: c.pct,
      volPct: totalVol > 0 ? sliceVol / totalVol : 0,
      color: c.color,
    };
  });
}

// --- Trade Frequency Distribution ---

export function buildFrequencyDistribution(
  wallets: Map<string, WalletProfile>,
  windowStart: number
): SizeBucket[] {
  const active = filterByWindow(wallets, windowStart);
  const total = active.length;

  const defs = [
    { label: "1 trade", from: 1, to: 2, color: "#94a3b8" },
    { label: "2–5", from: 2, to: 6, color: "#a78bfa" },
    { label: "6–20", from: 6, to: 21, color: "#6366f1" },
    { label: "21–50", from: 21, to: 51, color: "#f59e0b" },
    { label: "51–100", from: 51, to: 101, color: "#f97316" },
    { label: "> 100", from: 101, to: Infinity, color: "#ef4444" },
  ];

  return defs.map((d) => {
    const count = active.filter(
      (w) => w.tradeCount >= d.from && w.tradeCount < d.to
    ).length;
    return { label: d.label, count, pct: total > 0 ? count / total : 0, color: d.color };
  });
}

// --- Market Breadth ---

export function buildMarketBreadth(
  wallets: Map<string, WalletProfile>,
  windowStart: number
): SizeBucket[] {
  const active = filterByWindow(wallets, windowStart);
  const total = active.length;

  const defs = [
    { label: "1 market", from: 1, to: 2, color: "#94a3b8" },
    { label: "2–3", from: 2, to: 4, color: "#a78bfa" },
    { label: "4–10", from: 4, to: 11, color: "#6366f1" },
    { label: "11–20", from: 11, to: 21, color: "#f59e0b" },
    { label: "> 20", from: 21, to: Infinity, color: "#ef4444" },
  ];

  return defs.map((d) => {
    const count = active.filter(
      (w) => w.marketCount >= d.from && w.marketCount < d.to
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

export function buildBuySellStats(
  wallets: Map<string, WalletProfile>,
  windowStart: number
): BuySellStats {
  const active = filterByWindow(wallets, windowStart);
  let buyDom = 0,
    sellDom = 0,
    balanced = 0;

  for (const w of active) {
    if (w.buyCount > w.sellCount * 1.5) buyDom++;
    else if (w.sellCount > w.buyCount * 1.5) sellDom++;
    else balanced++;
  }

  return { buyDominant: buyDom, sellDominant: sellDom, balanced, total: active.length };
}
