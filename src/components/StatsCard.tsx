"use client";

interface StatsCardProps {
  label: string;
  value: number | string;
  description?: string;
  color?: string;
}

export default function StatsCard({
  label,
  value,
  description,
  color = "#6366f1",
}: StatsCardProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold" style={{ color }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}
