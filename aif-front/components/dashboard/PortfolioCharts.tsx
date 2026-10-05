"use client";

import { useState } from "react";

type Point = { date: string; label: string; value: number };
type Slice = { name: string; marketValue: number };

const chartColors = ["var(--pm-chart-1)", "var(--pm-chart-2)", "var(--pm-chart-3)", "var(--pm-chart-4)"];

function formatAxis(value: number) {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
  if (abs >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return `₹${Math.round(value)}`;
}

function shortName(name: string) {
  return name.split(" - ")[0] ?? name;
}

export default function PortfolioCharts({ trend, holdings }: { trend: Point[]; holdings: Slice[] }) {
  const [range, setRange] = useState<"1y" | "all">("all");
  const last = trend.at(-1);
  const visible =
    range === "1y" && last?.date
      ? trend.filter((point) => {
          const end = new Date(`${last.date}T00:00:00`).getTime();
          const start = new Date(`${point.date}T00:00:00`).getTime();
          return end - start <= 1000 * 60 * 60 * 24 * 370;
        })
      : trend;
  const points = visible.length > 0 ? visible : trend;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] lg:col-span-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Portfolio valuation trend</h2>
            <p className="mt-1 text-xs text-muted">From the first contribution to the current valuation</p>
          </div>
          <div className="flex rounded-full bg-[var(--pm-card-lilac-bg)] p-1 text-xs font-semibold">
            <button
              type="button"
              className={`rounded-full px-3 py-1 ${range === "1y" ? "bg-white text-[var(--pm-card-lilac-color)]" : "text-[var(--pm-card-lilac-color)]"}`}
              onClick={() => setRange("1y")}
            >
              1Y
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 ${range === "all" ? "bg-white text-[var(--pm-card-lilac-color)]" : "text-[var(--pm-card-lilac-color)]"}`}
              onClick={() => setRange("all")}
            >
              All
            </button>
          </div>
        </div>
        <TrendChart points={points} />
      </section>
      <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
        <h2 className="text-sm font-semibold text-foreground">Asset allocation</h2>
        <p className="mt-1 text-xs text-muted">Distribution across funds</p>
        <AllocationChart holdings={holdings} />
      </section>
    </div>
  );
}

function TrendChart({ points }: { points: Point[] }) {
  const width = 640;
  const height = 240;
  const pad = { top: 16, right: 12, bottom: 28, left: 58 };
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const ticks = min === max ? [min] : [max, min + (max - min) / 2, min];
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const coords = points.map((point, index) => {
    const x = pad.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    const y = pad.top + (1 - (point.value - min) / span) * innerH;
    return { ...point, x, y };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-56 w-full" role="img" aria-label="Portfolio valuation trend">
      {ticks.map((tick, index) => {
        const y = pad.top + (1 - (tick - min) / span) * innerH;
        return (
          <g key={`${index}-${tick}`}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--pm-border)" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--pm-muted)">
              {formatAxis(tick)}
            </text>
          </g>
        );
      })}
      <polyline fill="none" stroke="var(--pm-chart-1)" strokeWidth="3" points={line} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((point) => (
        <g key={`${point.label}-${point.x}`}>
          <circle cx={point.x} cy={point.y} r="4" fill="#ffffff" stroke="var(--pm-chart-1)" strokeWidth="2" />
          <text x={point.x} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--pm-muted)">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function AllocationChart({ holdings }: { holdings: Slice[] }) {
  const total = holdings.reduce((sum, item) => sum + item.marketValue, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="mt-4 flex flex-col items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90" role="img" aria-label="Asset allocation">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--pm-border)" strokeWidth="14" />
        {holdings.map((holding, index) => {
          const length = (holding.marketValue / total) * circumference;
          const dash = `${length} ${circumference - length}`;
          const circle = (
            <circle
              key={holding.name}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={chartColors[index % chartColors.length]}
              strokeWidth="14"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {holdings.map((holding, index) => {
          const share = Math.round((holding.marketValue / total) * 100);
          return (
            <li key={holding.name} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColors[index % chartColors.length] }} />
                <span className="truncate text-foreground">{shortName(holding.name)}</span>
              </span>
              <span className="font-semibold tabular-nums text-foreground">{share}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
