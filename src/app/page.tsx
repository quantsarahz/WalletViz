"use client";

import { useState, useEffect } from "react";
import StatsCard from "@/components/StatsCard";
import DistributionChart from "@/components/DistributionChart";
import ConcentrationChart from "@/components/ConcentrationChart";
import LorenzChart from "@/components/LorenzChart";
import WalletBubbleMap from "@/components/WalletBubbleMap";
import WaffleChart from "@/components/WaffleChart";
import BullseyeChart from "@/components/BullseyeChart";
import SpectrumBar from "@/components/SpectrumBar";

interface SizeBucket {
  label: string;
  count: number;
  pct: number;
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
  concentration: { label: string; walletPct: number; volPct: number; color: string }[];
  frequencyDistribution: SizeBucket[];
  marketBreadth: SizeBucket[];
  buySell: { buyDominant: number; sellDominant: number; balanced: number; total: number };
  gini: {
    giniVolume: number;
    giniTrades: number;
    lorenz: { cumWalletPct: number; cumVolPct: number }[];
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

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    fetch(`${basePath}/data/snapshot.json`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const o = data?.overview;

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto">
      {/* ===== Header ===== */}
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          Wallet<span className="text-indigo-400">Viz</span>
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Polymarket Active Wallet Snapshot
        </p>
        {o && (
          <p className="mt-2 text-xs text-gray-500">
            Last scan: {new Date(o.scannedAt).toLocaleString()}
          </p>
        )}
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
          <section className="mb-10 rounded-lg border border-gray-700/50 bg-gray-800/30 px-5 py-4 text-xs text-gray-400 leading-relaxed space-y-2">
            <p>
              <strong className="text-gray-300">What this is:</strong> Snapshot
              of Polymarket wallet activity — latest 1,000 trades from each of{" "}
              <strong className="text-gray-300">{o.eventsScanned.toLocaleString()}</strong> events.
              Activity-weighted: high-frequency wallets appear more prominently.
            </p>
            <p>
              <strong className="text-gray-300">Bot filtering:</strong>{" "}
              {o.botWallets.toLocaleString()} bots excluded (avg &gt;100 trades/day).
              Remaining: <strong className="text-gray-300">{o.humanWallets.toLocaleString()}</strong> human wallets.
            </p>
            <p>
              <strong className="text-gray-300">What this is not:</strong> Not a
              complete census or equal-weight sample. High-frequency traders and
              active markets are overrepresented.
            </p>
            <p>
              <strong className="text-gray-300">Sampling bias:</strong> Volume
              figures are <em>observed within this sample</em>, not lifetime
              totals. High-volume events cover hours; low-volume events span
              weeks. Treat all volume metrics as lower-bound estimates.
            </p>
          </section>

          {/* ===== Snapshot Overview ===== */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Snapshot Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatsCard
                label="Observed Human Wallets"
                value={o.humanWallets.toLocaleString()}
                description="After bot filtering"
                color="#6366f1"
              />
              <StatsCard
                label="Bot Wallets"
                value={o.botWallets.toLocaleString()}
                description={`${((o.botWallets / o.totalObservedWallets) * 100).toFixed(1)}% of total observed`}
                color="#ef4444"
              />
              <StatsCard
                label="Median Volume"
                value={fmt(o.medianVolume)}
                description="Per wallet, observed"
                color="#f59e0b"
              />
              <StatsCard
                label="Avg Volume"
                value={fmt(o.avgVolume)}
                description="Activity-weighted"
                color="#f59e0b"
              />
              <StatsCard
                label="Median Trades"
                value={o.medianTrades.toString()}
                description="Observed"
                color="#94a3b8"
              />
            </div>
          </section>

          {/* ===== Distribution ===== */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-2">Distribution</h2>
            <p className="text-xs text-gray-500 mb-6">
              All distributions below are based on {o.humanWallets.toLocaleString()} observed
              human wallets. Figures reflect activity within this sample, not
              total platform activity.
            </p>

            {/* Row 1: Wallet Size + Trade Frequency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-1">
                  Wallet Size (by Observed Volume)
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Each bubble represents wallets — size and color indicate volume tier.
                  Only {data.sizeDistribution.find(s => s.label.includes("Whale"))?.pct
                    ? (data.sizeDistribution.find(s => s.label.includes("Whale"))!.pct * 100).toFixed(1)
                    : "0.9"}% are whales.
                </p>
                <WalletBubbleMap data={data.sizeDistribution} />
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 flex flex-col">
                <h3 className="text-sm text-gray-400 mb-1">Trade Frequency</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Observed trades per wallet in this snapshot.
                </p>
                <WaffleChart data={data.frequencyDistribution} />
              </div>
            </div>

            {/* Row 2: Market Breadth + Buy/Sell */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-1">Market Participation</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Distinct markets per wallet. Center = 1 market, outer rings = broader participation.
                </p>
                <BullseyeChart data={data.marketBreadth} />
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-1">Buy vs Sell Behavior</h3>
                <p className="text-xs text-gray-600 mb-4">
                  By observed buy/sell ratio (1.5x threshold).
                </p>
                <SpectrumBar
                  buyDominant={data.buySell.buyDominant}
                  balanced={data.buySell.balanced}
                  sellDominant={data.buySell.sellDominant}
                  total={data.buySell.total}
                />
              </div>
            </div>

            {/* Row 3: Concentration + Lorenz */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-1">Volume Concentration</h3>
                <p className="text-xs text-gray-600 mb-4">
                  Share of observed volume held by top N% of human wallets.
                </p>
                <ConcentrationChart data={data.concentration} />
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                <h3 className="text-sm text-gray-400 mb-1">
                  Lorenz Curve (Volume Inequality)
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  Further from diagonal = more unequal. Based on observed volume.
                </p>
                <LorenzChart data={data.gini.lorenz} gini={data.gini.giniVolume} />
              </div>
            </div>

            {/* Gini Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                <p className="text-sm text-gray-400">Gini Coefficient (Volume)</p>
                <p className="text-3xl font-bold text-indigo-400 mt-1">
                  {data.gini.giniVolume.toFixed(3)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Extremely high inequality. Comparable to global wealth distribution (~0.85).
                </p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
                <p className="text-sm text-gray-400">Gini Coefficient (Trade Count)</p>
                <p className="text-3xl font-bold text-amber-400 mt-1">
                  {data.gini.giniTrades.toFixed(3)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  High inequality, but less extreme than volume — many small
                  wallets trade occasionally.
                </p>
              </div>
            </div>
          </section>


        </>
      )}

      <footer className="mt-12 pb-8 text-center text-xs text-gray-600 space-y-1">
        <p>WalletViz — Open source, built in public.</p>
        <p>
          Snapshot of observed Polymarket wallet activity. Not a complete census.
          Refreshed daily.
        </p>
      </footer>
    </main>
  );
}
