"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

interface ConcentrationItem {
  label: string;
  volPct: number;
  color: string;
}

export default function ConcentrationChart({ data }: { data: ConcentrationItem[] }) {
  const chartData = data.map((d) => ({
    label: d.label,
    "Volume Share": +(d.volPct * 100).toFixed(1),
    color: d.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
        <XAxis dataKey="label" tick={{ fill: "#999", fontSize: 12 }} />
        <YAxis
          tick={{ fill: "#999", fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            background: "#1a1a2e",
            border: "1px solid #333",
            borderRadius: "8px",
          }}
          formatter={(value: number) => [`${value}%`, "Volume Share"]}
        />
        <Bar dataKey="Volume Share" radius={[4, 4, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
