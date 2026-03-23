"use client";

import { useState, useEffect } from "react";
import StatsCard from "@/components/StatsCard";
import TierPieChart from "@/components/TierPieChart";
import DistributionChart from "@/components/DistributionChart";
import ConcentrationChart from "@/components/ConcentrationChart";
import TimeSeriesChart from "@/components/TimeSeriesChart";

interface DailyPoint {
  date: string;
  activeWallets: number;
  trades: number;
  volume: number;
}

interface SizeBucket {
  label: string;
  count: number;
  pct: number;
  color: string;
}

interface ConcentrationPoint {
  label: string;
  walletPct: number;
  volPct: number;
  color: string;
}

interface LandscapeData {
  overview: {
    active30d: number;
    active7d: number;
    totalObserved: number;
    totalTrades: number;
    observationStart: number;
    observationEnd: number;
    medianVolume30d: number;
    medianTrades30d: number;
    avgVolume30d: number;
    daysWithData: number;
    lastSync: string | null;
  };
  dailyActivity: DailyPoint[];
  sizeDistribution: SizeBucket[];
  concentration: ConcentrationPoint[];
  frequencyDistribution: SizeBucket[];
  marketBreadth: SizeBucket[];
  buySell: {
    buyDominant: number;
    sellDominant: number;
    balanced: number;
    total: number;
  };
  meta: {
    dataSource: string;
    lastSync: string | null;
    fetchedAt: string;
  };
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const [data, setData] = useState<LandscapeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState("");

  const fetchData = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = refresh ? "/api/landscape?refresh=1" : "/api/landscape";
      const res = await fetch(url);
      if (!res.ok) throw new Error("API request failed");
      setCacheStatus(res.headers.get("X-Cache") || "");
      setData(await res.json());
    } catch {
      setError("Failed to load data. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const o = data?.overview;

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          Wallet<span className="text-indigo-400">Viz</span>
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Polymarket Active Wallet Analytics
        </p>
        <p className="mt-1 text-sm text-gray-500">
          30-day active wallet analysis based on observed trading activity
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Refresh Data"}
          </button>
          {data && (
            <span className="text-xs text-gray-500">
              {cacheStatus === "HIT" ? "Cached" : "Fresh"} |{" "}
              {new Date(data.meta.fetchedAt).toLocaleString()}
            </span>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        {/* Methodology */}
        {data && o && (
          <div className="mt-4 rounded-lg border border-gray-700/50 bg-gray-800/30 px-4 py-3 text-xs text-gray-400 leading-relaxed">
            <strong className="text-gray-300">Methodology:</strong> Full scan
            of all active Polymarket events (~8,700), collecting the most recent
            1,000 trades per event. Data stored in SQLite and updated daily.{" "}
            {o.totalObserved.toLocaleString()} unique wallets observed across{" "}
            {o.daysWithData} days ({fmtDate(o.observationStart)}–
            {fmtDate(o.observationEnd)}). All distribution metrics are scoped to
            the 30-day window. Last sync:{" "}
            {o.lastSync
              ? new Date(o.lastSync).toLocaleString()
              : "pending"}
            .
          </div>
        )}
      </header>

      {/* Loading */}
      {loading && !data && (
        <div className="text-center py-24">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="mt-4 text-gray-400">
            Loading wallet data from database...
          </p>
        </div>
      )}

      {data && o && (
        <>
          {/* ===== 1. Active Wallet Overview ===== */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">
              Active Wallet Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatsCard
                label="30D Active Wallets"
                value={o.active30d.toLocaleString()}
                description="Observed in last 30 days"
                color="#6366f1"
              />
              <StatsCard
                label="7D Active Wallets"
                value={o.active7d.toLocaleString()}
                description="Observed in last 7 days"
                color="#818cf8"
              />
              <StatsCard
                label="Median Volume (30D)"
                value={fmt(o.medianVolume30d)}
                description="Per wallet"
                color="#f59e0b"
              />
              <StatsCard
                label="Avg Volume (30D)"
                value={fmt(o.avgVolume30d)}
                description="Per wallet"
                color="#f59e0b"
              />
              <StatsCard
                label="Median Trades (30D)"
                value={o.medianTrades30d.toString()}
                description="Per wallet"
                color="#94a3b8"
              />
            </div>
          </section>

          {/* ===== 2. Activity Trend ===== */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-2">Activity Trend</h2>
            <p className="text-xs text-gray-500 mb-6">
              Daily active wallets across all observed markets (30-day window)
            </p>

            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 mb-6">
              <h3 className="text-sm text-gray-400 mb-4">
                Daily Active Wallets
              </h3>
              <TimeSeriesChart
                data={data.dailyActivity}
                series={[
                  {
                    key: "activeWallets",
                    label: "Active Wallets",
                    color: "#6366f1",
                  },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-4">Daily Trades</h3>
                <TimeSeriesChart
                  data={data.dailyActivity}
                  series={[
                    { key: "trades", label: "Trades", color: "#f59e0b" },
                  ]}
                  height={250}
                />
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-4">Daily Volume</h3>
                <TimeSeriesChart
                  data={data.dailyActivity.map((d) => ({
                    ...d,
                    volume: Math.round(d.volume),
                  }))}
                  series={[
                    { key: "volume", label: "Volume ($)", color: "#8b5cf6" },
                  ]}
                  height={250}
                />
              </div>
            </div>
          </section>

          {/* ===== 3. Distribution (30D Active Wallets) ===== */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-2">Distribution</h2>
            <p className="text-xs text-gray-500 mb-6">
              Based on {o.active30d.toLocaleString()} wallets active in the
              30-day window
            </p>

            {/* Pie Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-4">
                  Wallet Size (by Observed Volume)
                </h3>
                <TierPieChart
                  data={data.sizeDistribution.map((s) => ({
                    label: s.label,
                    value: s.count,
                    pct: s.pct,
                    color: s.color,
                  }))}
                  valueLabel="Wallets"
                />
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-4">Trade Frequency</h3>
                <TierPieChart
                  data={data.frequencyDistribution.map((s) => ({
                    label: s.label,
                    value: s.count,
                    pct: s.pct,
                    color: s.color,
                  }))}
                  valueLabel="Wallets"
                />
              </div>
            </div>

            {/* Pie Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-4">
                  Market Participation
                </h3>
                <TierPieChart
                  data={data.marketBreadth.map((s) => ({
                    label: s.label,
                    value: s.count,
                    pct: s.pct,
                    color: s.color,
                  }))}
                  valueLabel="Wallets"
                />
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-4">
                  Buy vs Sell Behavior
                </h3>
                <TierPieChart
                  data={[
                    {
                      label: "Buy-dominant",
                      value: data.buySell.buyDominant,
                      pct: data.buySell.buyDominant / data.buySell.total,
                      color: "#10b981",
                    },
                    {
                      label: "Sell-dominant",
                      value: data.buySell.sellDominant,
                      pct: data.buySell.sellDominant / data.buySell.total,
                      color: "#ef4444",
                    },
                    {
                      label: "Balanced",
                      value: data.buySell.balanced,
                      pct: data.buySell.balanced / data.buySell.total,
                      color: "#94a3b8",
                    },
                  ]}
                  valueLabel="Wallets"
                />
              </div>
            </div>

            {/* Concentration */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 mb-6">
              <h3 className="text-sm text-gray-400 mb-1">
                Volume Concentration
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                What share of total observed volume is held by the top N% of
                wallets?
              </p>
              <ConcentrationChart data={data.concentration} />
            </div>

            {/* Histograms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-2">
                  Volume Distribution
                </h3>
                <DistributionChart
                  data={data.sizeDistribution.map((s) => ({
                    range: s.label.replace(/[()]/g, ""),
                    count: s.count,
                  }))}
                  color="#6366f1"
                  label="Wallets"
                />
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-2">
                  Trade Frequency
                </h3>
                <DistributionChart
                  data={data.frequencyDistribution.map((s) => ({
                    range: s.label,
                    count: s.count,
                  }))}
                  color="#f59e0b"
                  label="Wallets"
                />
              </div>
            </div>
          </section>
        </>
      )}

      <footer className="mt-12 pb-8 text-center text-xs text-gray-600 space-y-1">
        <p>WalletViz — Open source, built in public.</p>
        <p>
          Data from Polymarket API. Representative sample, not a complete
          census. Updated hourly.
        </p>
      </footer>
    </main>
  );
}
