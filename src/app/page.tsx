"use client";

import { useState, useEffect } from "react";
import StatsCard from "@/components/StatsCard";
import TierPieChart from "@/components/TierPieChart";
import DistributionChart from "@/components/DistributionChart";
import ConcentrationChart from "@/components/ConcentrationChart";

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

interface SnapshotData {
  overview: {
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
  };
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
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function Home() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = refresh ? "/api/landscape?refresh=1" : "/api/landscape";
      const res = await fetch(url);
      if (!res.ok) throw new Error("API request failed");
      setData(await res.json());
    } catch {
      setError("Failed to load data.");
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
          Polymarket Wallet Landscape
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Cross-sectional snapshot of the Polymarket wallet ecosystem
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          {o && (
            <span className="text-xs text-gray-500">
              Scanned: {new Date(o.scannedAt).toLocaleString()}
            </span>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </header>

      {/* Loading */}
      {loading && !data && (
        <div className="text-center py-24">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="mt-4 text-gray-400">Loading snapshot data...</p>
        </div>
      )}

      {data && o && (
        <>
          {/* ===== Methodology ===== */}
          <section className="mb-10 rounded-lg border border-gray-700/50 bg-gray-800/30 px-5 py-4 text-sm text-gray-400 leading-relaxed space-y-2">
            <p>
              <strong className="text-gray-300">What this is:</strong> A
              cross-sectional scan of the Polymarket wallet ecosystem. We
              collected the most recent 1,000 trades from each of{" "}
              <strong className="text-gray-300">
                {o.eventsScanned.toLocaleString()}
              </strong>{" "}
              active events, yielding{" "}
              <strong className="text-gray-300">
                {o.totalTrades.toLocaleString()}
              </strong>{" "}
              trades and{" "}
              <strong className="text-gray-300">
                {o.totalObservedWallets.toLocaleString()}
              </strong>{" "}
              unique wallets.
            </p>
            <p>
              <strong className="text-gray-300">Bot filtering:</strong>{" "}
              {o.botWallets.toLocaleString()} wallets identified as bots
              (averaging &gt;50 trades/day) and excluded from all analysis
              below. Remaining:{" "}
              <strong className="text-gray-300">
                {o.humanWallets.toLocaleString()}
              </strong>{" "}
              human wallets.
            </p>
            <p>
              <strong className="text-gray-300">What this is not:</strong> This
              is not a complete census of all Polymarket users. It is a
              representative snapshot of wallets with recent trading activity
              across active markets. The true number of active wallets is likely
              higher.
            </p>
          </section>

          {/* ===== Overview ===== */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Snapshot Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatsCard
                label="Human Wallets"
                value={o.humanWallets.toLocaleString()}
                description="After bot filtering"
                color="#6366f1"
              />
              <StatsCard
                label="Bot Wallets"
                value={o.botWallets.toLocaleString()}
                description={`${((o.botWallets / o.totalObservedWallets) * 100).toFixed(1)}% of observed`}
                color="#ef4444"
              />
              <StatsCard
                label="Median Volume"
                value={fmt(o.medianVolume)}
                description="Per human wallet"
                color="#f59e0b"
              />
              <StatsCard
                label="Avg Volume"
                value={fmt(o.avgVolume)}
                description="Per human wallet"
                color="#f59e0b"
              />
              <StatsCard
                label="Median Trades"
                value={o.medianTrades.toString()}
                description="Per human wallet"
                color="#94a3b8"
              />
            </div>
          </section>

          {/* ===== Distribution ===== */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-2">Distribution</h2>
            <p className="text-xs text-gray-500 mb-6">
              Based on {o.humanWallets.toLocaleString()} human wallets (bots
              excluded)
            </p>

            {/* Row 1: Size + Frequency */}
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

            {/* Row 2: Market Breadth + Buy/Sell */}
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
                human wallets?
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
          Snapshot of the Polymarket wallet ecosystem. Not a complete census.
          Refreshed daily.
        </p>
      </footer>
    </main>
  );
}
