"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Bucket {
  range: string;
  count: number;
}

interface Props {
  data: Bucket[];
  color?: string;
  label?: string;
}

export default function DistributionChart({
  data,
  color = "#6366f1",
  label = "Wallets",
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
        <XAxis
          dataKey="range"
          tick={{ fill: "#999", fontSize: 11 }}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fill: "#999", fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: "#1a1a2e",
            border: "1px solid #333",
            borderRadius: "8px",
          }}
          formatter={(value: number) => [value.toLocaleString(), label]}
        />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
