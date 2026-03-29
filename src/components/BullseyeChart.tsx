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

export default function BullseyeChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const W = container.clientWidth;
    const H = 300;
    const dpr = window.devicePixelRatio || 2;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = W / 2 - 50;
    const cy = H / 2;
    const maxR = Math.min(H / 2 - 10, 140);
    const minR = 20;

    // Calculate ring radii — area proportional to pct
    const totalArea = maxR * maxR - minR * minR;
    const rings: { rInner: number; rOuter: number; label: string; pct: number; color: string }[] = [];
    let rInner = minR;
    for (let i = 0; i < data.length; i++) {
      const ringArea = totalArea * data[i].pct;
      const rOuter = Math.sqrt(rInner * rInner + ringArea);
      rings.push({ rInner, rOuter, label: data[i].label, pct: data[i].pct, color: data[i].color });
      rInner = rOuter;
    }

    // Draw rings outside-in
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, ring.rOuter, 0, Math.PI * 2);
      ctx.arc(cx, cy, ring.rInner, 0, Math.PI * 2, true);
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, ring.rInner, cx, cy, ring.rOuter);
      grad.addColorStop(0, ring.color + "cc");
      grad.addColorStop(1, ring.color + "88");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ring border
      ctx.beginPath();
      ctx.arc(cx, cy, ring.rOuter, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, minR - 2, 0, Math.PI * 2);
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, minR);
    centerGrad.addColorStop(0, "rgba(255,255,255,0.12)");
    centerGrad.addColorStop(1, "rgba(255,255,255,0.02)");
    ctx.fillStyle = centerGrad;
    ctx.fill();

    // Subtle radial lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * minR, cy + Math.sin(angle) * minR);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();
    }

    // Labels
    ctx.textAlign = "center";
    let calloutIdx = 0;
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      const thickness = ring.rOuter - ring.rInner;
      const labelR = (ring.rInner + ring.rOuter) / 2;

      if (thickness > 22) {
        ctx.fillStyle = "#fff";
        ctx.font = `700 ${thickness > 40 ? 13 : 11}px -apple-system, sans-serif`;
        ctx.fillText(ring.label, cx, cy - labelR - 1);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = `600 ${thickness > 40 ? 12 : 10}px -apple-system, sans-serif`;
        ctx.fillText(`${(ring.pct * 100).toFixed(1)}%`, cx, cy - labelR + 12);
      } else {
        // Callout
        const angle = -Math.PI * 0.15 + calloutIdx * 0.4;
        const midR = (ring.rInner + ring.rOuter) / 2;
        const startX = cx + Math.cos(angle) * midR;
        const startY = cy + Math.sin(angle) * midR;
        const elbowX = cx + Math.cos(angle) * (maxR + 20);
        const elbowY = cy + Math.sin(angle) * (maxR + 20);
        const endX = cx + maxR + 50;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(endX, elbowY);
        ctx.strokeStyle = ring.color + "99";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(startX, startY, 2, 0, Math.PI * 2);
        ctx.fillStyle = ring.color;
        ctx.fill();

        ctx.textAlign = "left";
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "600 11px -apple-system, sans-serif";
        ctx.fillText(ring.label, endX + 6, elbowY - 1);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "500 10px -apple-system, sans-serif";
        ctx.fillText(`${(ring.pct * 100).toFixed(1)}%`, endX + 6, elbowY + 11);
        ctx.textAlign = "center";
        calloutIdx++;
      }
    }
  }, [data]);

  return (
    <div className="w-full rounded-lg overflow-hidden">
      <canvas ref={canvasRef} />
    </div>
  );
}
