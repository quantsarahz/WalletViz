"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface Props {
  data: { cumWalletPct: number; cumVolPct: number }[];
  gini: number;
}

export default function LorenzChart({ data, gini }: Props) {
  const chartData = data.map((d) => ({
    wallets: +(d.cumWalletPct * 100).toFixed(1),
    volume: +(d.cumVolPct * 100).toFixed(1),
    equality: +(d.cumWalletPct * 100).toFixed(1),
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="lorenzGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis
            dataKey="wallets"
            tick={{ fill: "#999", fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: "Cumulative % of wallets", position: "insideBottom", offset: -5, fill: "#666", fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: "#999", fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: "Cumulative % of volume", angle: -90, position: "insideLeft", offset: 10, fill: "#666", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              name === "volume" ? "Observed Volume" : "Perfect Equality",
            ]}
            labelFormatter={(v) => `Bottom ${v}% of wallets`}
          />
          <Area type="monotone" dataKey="equality" stroke="#555" strokeDasharray="4 4" fill="none" dot={false} />
          <Area type="monotone" dataKey="volume" stroke="#6366f1" fill="url(#lorenzGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-gray-500 mt-2">
        Gini coefficient: <strong className="text-gray-300">{gini.toFixed(3)}</strong>
        <span className="ml-2 text-gray-600">(0 = perfect equality, 1 = maximum inequality)</span>
      </p>
    </div>
  );
}
