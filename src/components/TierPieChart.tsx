"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PieSlice {
  label: string;
  value: number;
  pct: number;
  color: string;
}

interface Props {
  data: PieSlice[];
  title?: string;
  valueLabel?: string;
  formatValue?: (v: number) => string;
}

export default function TierPieChart({
  data,
  valueLabel = "count",
  formatValue,
}: Props) {
  const fmt = formatValue || ((v: number) => v.toLocaleString());

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={105}
          innerRadius={50}
          strokeWidth={2}
          stroke="#111"
          label={({ pct }) => `${(pct * 100).toFixed(1)}%`}
          labelLine={{ stroke: "#555" }}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#1a1a2e",
            border: "1px solid #333",
            borderRadius: "8px",
          }}
          formatter={(value: number, name: string) => [
            `${fmt(value)} (${((value / data.reduce((s, d) => s + d.value, 0)) * 100).toFixed(1)}%)`,
            name,
          ]}
          labelFormatter={() => valueLabel}
        />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: "#ccc", fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
