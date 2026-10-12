"use client";

import { useState } from "react";
import { LuChartLine, LuChartPie } from "react-icons/lu";
import { formatInr } from "@/lib/format";

type Point = { date: string; label: string; value: number; capital: number };
type Slice = { name: string; marketValue: number };

const chartColors = ["#2E5FA5", "#4482D8", "#CF933C", "#7BA6E4"];

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
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-[#E6EDF5] bg-white p-5 shadow-[0_8px_24px_rgba(20,50,90,0.04)] lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-holdings-bg)] text-[var(--pm-nav-holdings-color)]">
              <LuChartLine className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#16324F]">Portfolio valuation trend</h2>
              <p className="text-xs text-[#7B8794]">Capital from the ledger, and unit value at the latest NAV</p>
            </div>
          </div>
          <div className="flex rounded-full bg-[#F4F7FB] p-1 text-xs font-semibold">
            <button
              type="button"
              className={`rounded-full px-3 py-1 ${range === "1y" ? "bg-[var(--pm-nav-dashboard-color)] text-white" : "text-[#5C6B7A]"}`}
              onClick={() => setRange("1y")}
            >
              1Y
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 ${range === "all" ? "bg-[var(--pm-nav-dashboard-color)] text-white" : "text-[#5C6B7A]"}`}
              onClick={() => setRange("all")}
            >
              All
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-[#5C6B7A]">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-6 rounded-full bg-[#2E5FA5]" />
            Portfolio value
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-6 rounded-full bg-[#F97316]" />
            Invested capital
          </span>
        </div>
        <TrendChart points={points} />
      </section>
      <section className="rounded-2xl border border-[#E6EDF5] bg-white p-5 shadow-[0_8px_24px_rgba(20,50,90,0.04)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-statements-bg)] text-[var(--pm-nav-statements-color)]">
            <LuChartPie className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Asset allocation</h2>
            <p className="text-xs text-[#7B8794]">Distribution across funds</p>
          </div>
        </div>
        <AllocationChart holdings={holdings} />
      </section>
    </div>
  );
}

function stepCoords(coords: Array<Point & { x: number; y: number }>, key: "value" | "capital", yFor: (amount: number) => number) {
  const stepped: Array<{ x: number; y: number }> = [];
  coords.forEach((point, index) => {
    const y = yFor(point[key]);
    if (index === 0) {
      stepped.push({ x: point.x, y });
      return;
    }
    stepped.push({ x: point.x, y: stepped[stepped.length - 1].y });
    stepped.push({ x: point.x, y });
  });
  return stepped;
}

function TrendChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const width = 640;
  const height = 268;
  const pad = { top: 18, right: 16, bottom: 36, left: 64 };
  const amounts = points.flatMap((point) => [point.value, point.capital]);
  const max = Math.max(0, ...amounts);
  const span = max || 1;
  const ticks = [max, max / 2, 0];
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const yFor = (amount: number) => pad.top + (1 - amount / span) * innerH;
  const coords = points.map((point, index) => {
    const x = pad.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    return { ...point, x, y: yFor(point.value) };
  });
  const valueLine = stepCoords(coords, "value", yFor).map((point) => `${point.x},${point.y}`).join(" ");
  const capitalLine = stepCoords(coords, "capital", yFor).map((point) => `${point.x},${point.y}`).join(" ");
  const baseline = pad.top + innerH;
  const area = valueLine ? `${coords[0].x},${baseline} ${valueLine} ${coords[coords.length - 1].x},${baseline}` : "";
  const current = active == null ? null : coords[active];

  function nearest(clientX: number, bounds: DOMRect) {
    const x = ((clientX - bounds.left) / bounds.width) * width;
    let best = 0;
    coords.forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(coords[best].x - x)) best = index;
    });
    setActive(best);
  }

  return (
    <div className="relative mt-2">
      <svg
        key={points.map((point) => point.date).join("-")}
        viewBox={`0 0 ${width} ${height}`}
        className="h-64 w-full"
        role="img"
        aria-label="Portfolio valuation trend"
        onMouseLeave={() => setActive(null)}
        onMouseMove={(event) => nearest(event.clientX, event.currentTarget.getBoundingClientRect())}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E5FA5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2E5FA5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick, index) => {
          const y = yFor(tick);
          return (
            <g key={`${index}-${tick}`}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#E6EDF5" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#7B8794">
                {formatAxis(tick)}
              </text>
            </g>
          );
        })}
        {area ? <polygon points={area} fill="url(#trend-fill)" className="dash-area" /> : null}
        <polyline fill="none" stroke="#F97316" strokeWidth="2.5" strokeDasharray="7 6" points={capitalLine} strokeLinejoin="round" strokeLinecap="round" />
        <polyline
          fill="none"
          stroke="#2E5FA5"
          strokeWidth="3"
          points={valueLine}
          pathLength={1}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="dash-line"
        />
        {current ? <line x1={current.x} x2={current.x} y1={pad.top} y2={baseline} stroke="#D5DDE6" /> : null}
        {coords.map((point, index) => {
          const previous = coords[index - 1];
          const showLabel = !previous || point.x - previous.x > 56 || index === coords.length - 1;
          return (
          <g key={point.date} className="dash-dot" style={{ animationDelay: `${420 + index * 70}ms` }}>
            <circle cx={point.x} cy={yFor(point.capital)} r="3.5" fill="#ffffff" stroke="#F97316" strokeWidth="2" />
            <circle cx={point.x} cy={point.y} r="4.5" fill="#ffffff" stroke="#2E5FA5" strokeWidth="2" />
            {showLabel ? (
              <text x={point.x} y={height - 10} textAnchor="middle" fontSize="11" fill="#7B8794">
                {point.label}
              </text>
            ) : null}
          </g>
          );
        })}
      </svg>
      {current ? (
        <div
          className="pointer-events-none absolute top-2 rounded-xl border border-[#E6EDF5] bg-white px-3 py-2 text-xs shadow-[0_8px_24px_rgba(20,50,90,0.08)]"
          style={{ left: `min(${(current.x / width) * 100}%, calc(100% - 11rem))` }}
        >
          <p className="font-semibold text-[#16324F]">{current.label}</p>
          <p className="mt-1 text-[#2E5FA5]">Value {formatInr(current.value)}</p>
          <p className="text-[#EA6C0C]">Capital {formatInr(current.capital)}</p>
        </div>
      ) : null}
    </div>
  );
}

function AllocationChart({ holdings }: { holdings: Slice[] }) {
  const funds = new Map<string, number>();
  holdings.forEach((holding) => {
    const name = shortName(holding.name).trim();
    funds.set(name, (funds.get(name) ?? 0) + holding.marketValue);
  });
  const slices = [...funds.entries()].map(([name, marketValue]) => ({ name, marketValue }));
  const total = slices.reduce((sum, item) => sum + item.marketValue, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="mt-4 flex flex-col items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90" role="img" aria-label="Asset allocation">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--pm-border)" strokeWidth="14" />
        {slices.map((holding, index) => {
          const length = (holding.marketValue / total) * circumference;
          const dash = `${length} ${circumference - length}`;
          const circle = (
            <circle
              key={`${holding.name}-${index}`}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={chartColors[index % chartColors.length]}
              strokeWidth="14"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              className="dash-seg"
              style={{ ["--ring" as string]: circumference, animationDelay: `${180 + index * 120}ms` }}
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {slices.map((holding, index) => {
          const share = Math.round((holding.marketValue / total) * 100);
          return (
            <li
              key={`${holding.name}-${index}`}
              className="dash-rise flex items-center justify-between gap-3"
              style={{ animationDelay: `${260 + index * 80}ms` }}
            >
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
