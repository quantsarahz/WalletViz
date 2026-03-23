"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  series: SeriesDef[];
  height?: number;
}

export default function TimeSeriesChart({ data, series, height = 350 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#999", fontSize: 11 }}
          tickFormatter={(v) => v.slice(5)} // MM-DD
        />
        <YAxis tick={{ fill: "#999", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "#1a1a2e",
            border: "1px solid #333",
            borderRadius: "8px",
            fontSize: 13,
          }}
          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
        />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: "#ccc", fontSize: 12 }}>{value}</span>
          )}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            fill={`url(#grad-${s.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
