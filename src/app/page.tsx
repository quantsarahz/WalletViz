"use client";

import { useState, useEffect } from "react";
import FunnelChart from "@/components/FunnelChart";
import StatsCard from "@/components/StatsCard";

interface WalletData {
  totalWallets: number;
  inactiveWallets: number;
  botWallets: number;
  activeWallets: number;
  totalLeaderboardWallets: number;
  sampleSize: number;
  fetchedAt: string;
}

// Demo data for initial display / fallback
const DEMO_DATA: WalletData = {
  totalLeaderboardWallets: 1050,
  totalWallets: 1050,
  inactiveWallets: 340,
  botWallets: 87,
  activeWallets: 623,
  sampleSize: 50,
  fetchedAt: new Date().toISOString(),
};

export default function Home() {
  const [data, setData] = useState<WalletData>(DEMO_DATA);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const fetchLiveData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet-stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsLive(true);
      }
    } catch (err) {
      console.error("Failed to load live data:", err);
    } finally {
      setLoading(false);
    }
  };

  const afterInactive = data.totalWallets - data.inactiveWallets;

  const funnelData = [
    {
      name: "Total Wallets",
      value: data.totalWallets,
      color: "#6366f1",
    },
    {
      name: "After Removing Inactive",
      value: afterInactive,
      color: "#f59e0b",
    },
    {
      name: "After Removing Bots",
      value: data.activeWallets,
      color: "#10b981",
    },
  ];

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">
          Wallet<span className="text-indigo-400">Viz</span>
        </h1>
        <p className="mt-2 text-gray-400">
          Polymarket Wallet Analytics Dashboard
        </p>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={fetchLiveData}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Fetch Live Data"}
          </button>
          <span className="text-xs text-gray-500">
            {isLive ? "Live data" : "Demo data"} | Updated:{" "}
            {new Date(data.fetchedAt).toLocaleString()}
          </span>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <StatsCard
          label="Total Wallets"
          value={data.totalWallets}
          description="All wallets on leaderboard"
          color="#6366f1"
        />
        <StatsCard
          label="Inactive Wallets"
          value={data.inactiveWallets}
          description="No trades in 30 days"
          color="#ef4444"
        />
        <StatsCard
          label="Bot Wallets"
          value={data.botWallets}
          description="Avg >100 trades/day"
          color="#f59e0b"
        />
        <StatsCard
          label="Active Wallets"
          value={data.activeWallets}
          description="Real active traders"
          color="#10b981"
        />
      </section>

      {/* Funnel Visualization */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="text-xl font-semibold mb-6">
          Wallet Filtering Funnel
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Total wallets → Remove inactive (no trades in 30 days) → Remove bots
          (avg &gt;100 trades/day) → Active wallets
        </p>
        <FunnelChart data={funnelData} />
      </section>

      {/* Percentage Breakdown */}
      <section className="mt-8 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="text-xl font-semibold mb-4">Composition</h2>
        <div className="space-y-3">
          {[
            {
              label: "Inactive",
              pct: ((data.inactiveWallets / data.totalWallets) * 100).toFixed(1),
              color: "bg-red-500",
            },
            {
              label: "Bots",
              pct: ((data.botWallets / data.totalWallets) * 100).toFixed(1),
              color: "bg-amber-500",
            },
            {
              label: "Active",
              pct: ((data.activeWallets / data.totalWallets) * 100).toFixed(1),
              color: "bg-emerald-500",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-20 text-sm text-gray-400">{item.label}</span>
              <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <span className="w-16 text-right text-sm font-medium">
                {item.pct}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-gray-600">
        Open source — built in public. Data from Polymarket Data API.
      </footer>
    </main>
  );
}
