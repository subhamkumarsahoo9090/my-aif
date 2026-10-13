"use client";

import { useState } from "react";
import { LuChartLine } from "react-icons/lu";
import { formatNav } from "@/lib/format";

export type NavPoint = { date: string; label: string; nav: number };

const cardClass = "h-full rounded-2xl border border-[#E6EDF5] bg-white p-5 shadow-[0_8px_24px_rgba(20,50,90,0.04)]";

export default function NavChart({ points }: { points: NavPoint[] }) {
  return (
    <section className={cardClass}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-holdings-bg)] text-[var(--pm-nav-holdings-color)]">
          <LuChartLine className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-[#16324F]">NAV</h2>
          <p className="text-xs text-[#7B8794]">Saved net asset value by date</p>
        </div>
      </div>
      {points.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-10 text-center text-sm text-[#7B8794]">
          No NAV has been saved yet.
        </p>
      ) : (
        <NavLine points={points} />
      )}
    </section>
  );
}

function NavLine({ points }: { points: NavPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const width = 640;
  const height = 268;
  const pad = { top: 18, right: 16, bottom: 36, left: 72 };
  const values = points.map((point) => point.nav);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padAmount = high === low ? Math.max(high * 0.02, 1) : (high - low) * 0.12;
  const min = Math.max(0, low - padAmount);
  const max = high + padAmount;
  const span = max - min || 1;
  const ticks = [max, min + span / 2, min];
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const yFor = (amount: number) => pad.top + (1 - (amount - min) / span) * innerH;
  const coords = points.map((point, index) => {
    const x = pad.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    return { ...point, x, y: yFor(point.nav) };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const baseline = pad.top + innerH;
  const area = line ? `${coords[0].x},${baseline} ${line} ${coords[coords.length - 1].x},${baseline}` : "";
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
    <div className="relative mt-4">
      <svg
        key={points.map((point) => point.date).join("-")}
        viewBox={`0 0 ${width} ${height}`}
        className="h-64 w-full"
        role="img"
        aria-label="NAV trend"
        onMouseLeave={() => setActive(null)}
        onMouseMove={(event) => nearest(event.clientX, event.currentTarget.getBoundingClientRect())}
      >
        <defs>
          <linearGradient id="nav-fill" x1="0" y1="0" x2="0" y2="1">
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
        {area ? <polygon points={area} fill="url(#nav-fill)" className="dash-area" /> : null}
        <polyline
          fill="none"
          stroke="#2E5FA5"
          strokeWidth="3"
          points={line}
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
          style={{ left: `min(${(current.x / width) * 100}%, calc(100% - 9rem))` }}
        >
          <p className="font-semibold text-[#16324F]">{current.label}</p>
          <p className="mt-1 text-[#2E5FA5]">NAV {formatNav(current.nav)}</p>
        </div>
      ) : null}
    </div>
  );
}

function formatAxis(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}
