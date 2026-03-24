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

const RADIAN = Math.PI / 180;

function renderLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  pct,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  pct: number;
}) {
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ccc"
      fontSize={12}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {(pct * 100).toFixed(1)}%
    </text>
  );
}

export default function TierPieChart({
  data,
  valueLabel = "count",
  formatValue,
}: Props) {
  const fmt = formatValue || ((v: number) => v.toLocaleString());

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="42%"
          outerRadius={80}
          innerRadius={40}
          strokeWidth={2}
          stroke="#111"
          label={renderLabel}
          labelLine={{ stroke: "#555", strokeWidth: 1 }}
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
