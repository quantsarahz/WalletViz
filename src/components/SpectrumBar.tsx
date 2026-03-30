"use client";

import { useRef, useEffect } from "react";

interface Props {
  buyDominant: number;
  balanced: number;
  sellDominant: number;
  total: number;
}

export default function SpectrumBar({ buyDominant, balanced, sellDominant, total }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const W = container.clientWidth;
    const H = 100;
    const dpr = window.devicePixelRatio || 2;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const buyPct = buyDominant / total;
    const balPct = balanced / total;
    const sellPct = sellDominant / total;

    const barX = 0;
    const barY = 24;
    const barH = 44;
    const barW = W;
    const radius = 10;

    const segments = [
      { pct: buyPct, color: "#34d399", label: "Buy-dominant" },
      { pct: balPct, color: "#94a3b8", label: "Balanced" },
      { pct: sellPct, color: "#f87171", label: "Sell-dominant" },
    ];

    // Draw segments
    let x = barX;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segW = barW * seg.pct;

      const grad = ctx.createLinearGradient(x, barY, x + segW, barY);
      grad.addColorStop(0, seg.color + "cc");
      grad.addColorStop(1, seg.color + "99");
      ctx.fillStyle = grad;

      if (i === 0) {
        ctx.beginPath();
        ctx.roundRect(x, barY, segW + 2, barH, [radius, 0, 0, radius]);
        ctx.fill();
      } else if (i === segments.length - 1) {
        ctx.beginPath();
        ctx.roundRect(x - 2, barY, segW + 2, barH, [0, radius, radius, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(x, barY, segW, barH);
      }

      // Percentage inside
      ctx.fillStyle = "#fff";
      ctx.font = "700 15px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${(seg.pct * 100).toFixed(1)}%`, x + segW / 2, barY + barH / 2 + 5);

      // Label above
      ctx.fillStyle = seg.color;
      ctx.font = "600 11px -apple-system, sans-serif";
      ctx.fillText(seg.label, x + segW / 2, barY - 8);

      x += segW;
    }

    // Direction hints
    ctx.font = "500 11px -apple-system, sans-serif";
    ctx.fillStyle = "#34d399";
    ctx.textAlign = "left";
    ctx.fillText("← More buying", barX, barY + barH + 18);
    ctx.fillStyle = "#f87171";
    ctx.textAlign = "right";
    ctx.fillText("More selling →", barX + barW, barY + barH + 18);
  }, [buyDominant, balanced, sellDominant, total]);

  return (
    <div className="w-full rounded-lg overflow-hidden">
      <canvas ref={canvasRef} />
    </div>
  );
}
