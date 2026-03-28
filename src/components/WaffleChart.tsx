"use client";

import { useRef, useEffect } from "react";

interface Bucket {
  label: string;
  count: number;
  pct: number;
  color: string;
}

interface Props {
  data: Bucket[];
}

export default function WaffleChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const W = container.clientWidth;
    const cols = 20;
    const rows = 5;
    const gap = 3;
    const cellSize = Math.floor((W - (cols - 1) * gap) / cols);
    const H = rows * (cellSize + gap) - gap;

    const dpr = window.devicePixelRatio || 2;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Assign colors to 100 cells based on real percentages
    const cells: string[] = [];
    for (const bucket of data) {
      const count = Math.round(bucket.pct * 100);
      for (let i = 0; i < count && cells.length < 100; i++) {
        cells.push(bucket.color);
      }
    }
    while (cells.length < 100) cells.push(data[0].color);

    // Draw
    for (let i = 0; i < 100; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cellSize + gap);
      const y = row * (cellSize + gap);

      ctx.globalAlpha = 0.85;
      ctx.fillStyle = cells[i];
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, 4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [data]);

  return (
    <div className="w-full flex flex-col h-full">
      <div className="rounded-lg overflow-hidden">
        <canvas ref={canvasRef} />
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-3 mt-6">
        {data.map((bucket) => (
          <div key={bucket.label} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded shrink-0 w-2.5 h-2.5"
              style={{ backgroundColor: bucket.color }}
            />
            <span className="text-xs text-gray-400">{bucket.label}</span>
            <span className="text-xs text-gray-500 tabular-nums">{(bucket.pct * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-600 mt-auto pt-4">1 square = 1% of wallets</p>
    </div>
  );
}
