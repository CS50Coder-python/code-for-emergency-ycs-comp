"use client";

import { useEffect, useRef } from "react";

/**
 * Wind-driven ember particles on a canvas. Direction is a compass bearing
 * (where the wind blows toward). Respects reduced-motion by drawing once.
 */
export default function EmberField({
  bearing = 140,
  density = 90,
  className = "",
}: {
  bearing?: number;
  density?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    const rad = ((bearing - 90) * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    type P = { x: number; y: number; v: number; r: number; life: number; hue: number };
    let parts: P[] = [];

    const spawn = (): P => ({
      x: Math.random() * w,
      y: Math.random() * h,
      v: 0.6 + Math.random() * 1.8,
      r: 0.6 + Math.random() * 1.6,
      life: 0.4 + Math.random() * 0.6,
      hue: Math.random() < 0.75 ? 40 : 330,
    });

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: density }, spawn);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const wobble = Math.sin((p.x + p.y) * 0.02) * 0.3;
        p.x += (dx + wobble * -dy) * p.v;
        p.y += (dy + wobble * dx) * p.v;
        p.life -= 0.0025;
        if (p.life <= 0 || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
          Object.assign(p, spawn(), { life: 1 });
          if (Math.random() < 0.5) {
            p.x = dx > 0 ? -5 : w + 5;
          } else {
            p.y = dy > 0 ? -5 : h + 5;
          }
        }
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 95%, 62%, ${Math.min(0.9, p.life)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${p.hue}, 95%, 62%, ${p.life * 0.25})`;
        ctx.lineWidth = p.r * 0.8;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - dx * p.v * 6, p.y - dy * p.v * 6);
        ctx.stroke();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [bearing, density]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
