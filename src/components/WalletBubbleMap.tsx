"use client";

import { useRef, useEffect } from "react";

interface SizeBucket {
  label: string;
  count: number;
  pct: number;
  color: string;
}

interface Props {
  data: SizeBucket[];
}

const CAT_CONFIG = [
  { minR: 1.5, maxR: 3 },
  { minR: 2, maxR: 5 },
  { minR: 4, maxR: 9 },
  { minR: 8, maxR: 16 },
  { minR: 14, maxR: 28 },
];

const LABELS = ["Micro", "Small", "Medium", "Large", "Whale"];
const RANGES = ["< $10", "$10–$100", "$100–$1K", "$1K–$10K", "> $10K"];

export default function WalletBubbleMap({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const W = container.clientWidth;
    const H = 260;
    const dpr = window.devicePixelRatio || 2;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Seeded random
    let seed = 42;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    // Background
    ctx.fillStyle = "#0a0b10";
    ctx.fillRect(0, 0, W, H);

    // Generate bubbles from real data
    const totalBubbles = 500;
    const bubbles: { x: number; y: number; r: number; color: string; alpha: number }[] = [];

    for (let ci = 0; ci < data.length; ci++) {
      const cat = data[ci];
      const cfg = CAT_CONFIG[ci] || CAT_CONFIG[CAT_CONFIG.length - 1];
      const count = Math.max(1, Math.round(totalBubbles * cat.pct));
      for (let i = 0; i < count; i++) {
        const r = rand() * (cfg.maxR - cfg.minR) + cfg.minR;
        bubbles.push({
          x: rand() * W,
          y: rand() * H,
          r,
          color: cat.color,
          alpha: rand() * 0.4 + 0.5,
        });
      }
    }

    // Sort large behind small
    bubbles.sort((a, b) => b.r - a.r);

    for (const b of bubbles) {
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.r > 12 ? 15 : b.r > 6 ? 8 : 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      const alpha = Math.round(b.alpha * 255)
        .toString(16)
        .padStart(2, "0");
      ctx.fillStyle = b.color + alpha;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Subtle vignette
    const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.55);
    vignette.addColorStop(0, "rgba(10,11,16,0)");
    vignette.addColorStop(1, "rgba(10,11,16,0.4)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }, [data]);

  return (
    <div className="w-full flex gap-4">
      <div className="flex-1 rounded-lg overflow-hidden min-w-0">
        <canvas ref={canvasRef} />
      </div>
      <div className="flex flex-col justify-center gap-3 shrink-0">
        {data.map((cat, i) => (
          <div key={cat.label} className="flex items-start gap-2 whitespace-nowrap">
            <span
              className="inline-block rounded-full shrink-0 w-2 h-2 mt-1"
              style={{ backgroundColor: cat.color }}
            />
            <div className="leading-tight">
              <span className="text-xs text-gray-300">{LABELS[i]} <span className="text-gray-500">{RANGES[i]}</span></span>
              <br />
              <span className="text-[11px] text-gray-500 tabular-nums">{(cat.pct * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
