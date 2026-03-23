"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface FunnelStep {
  name: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  data: FunnelStep[];
}

export default function FunnelChart({ data }: FunnelChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 20, right: 80, left: 40, bottom: 20 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          tick={{ fill: "#ccc", fontSize: 14 }}
        />
        <Tooltip
          formatter={(value: number) => [value.toLocaleString(), "Wallets"]}
          contentStyle={{
            background: "#1a1a2e",
            border: "1px solid #333",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#fff" }}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={48}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(value: number) => value.toLocaleString()}
            style={{ fill: "#fff", fontSize: 16, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
