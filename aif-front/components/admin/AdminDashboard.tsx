"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LuChartColumn, LuTrendingUp, LuWallet } from "react-icons/lu";
import NavChart from "@/components/admin/NavChart";
import PortfolioCharts from "@/components/dashboard/PortfolioCharts";
import LoadError from "@/components/ui/LoadError";
import PnlValue from "@/components/ui/PnlValue";
import Skeleton from "@/components/ui/Skeleton";
import { formatInr } from "@/lib/format";
import { api } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";

type Overview = {
  metrics: {
    totalPortfolioValue: number;
    investedCapital: number;
    currentValuation: number;
    realizedPnl: number;
    unrealizedPnl: number;
  };
  holdings: Array<{ name: string; marketValue: number }>;
  trend: Array<{ date: string; label: string; value: number; capital: number }>;
  nav: Array<{ date: string; label: string; nav: number }>;
  clients: Array<{ code: string; name: string }>;
  focus: { code: string; name: string } | null;
};

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.04)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white py-2.5 pl-3 text-sm text-[#16324F] outline-none focus:border-[#F97316]";

export default function AdminDashboard() {
  const [client, setClient] = useState("");
  const overviewUrl = client ? `${api.admin.overview}?client=${encodeURIComponent(client)}` : api.admin.overview;
  const { data, status, reload } = usePortalResource<Overview>(overviewUrl);

  return (
    <div className="w-full">
      <div className={`${cardClass} mb-4 flex flex-wrap items-center justify-between gap-3 p-4`}>
        <div>
          <p className="text-sm font-semibold text-[#16324F]">{data?.focus ? data.focus.name : "All investors"}</p>
          <p className="text-xs text-[#7B8794]">
            {data?.focus ? `AIF code ${data.focus.code}` : "Combined totals for every investor"}
          </p>
        </div>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Investor</span>
          <select
            value={client}
            onChange={(event) => setClient(event.target.value)}
            className={`${fieldClass} appearance-none pr-10!`}
          >
            <option value="">All investors</option>
            {(data?.clients ?? []).map((item) => (
              <option key={item.code} value={item.code}>
                {item.name} · {item.code}
              </option>
            ))}
          </select>
          <Chevron />
        </label>
      </div>
      {status === "loading" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
          <Skeleton className="h-72 sm:col-span-2 xl:col-span-3" />
          <Skeleton className="h-72" />
        </div>
      ) : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" && data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Total portfolio value"
              amount={data.metrics.totalPortfolioValue}
              note={data.focus ? "This investor’s current valuation" : "Current aggregate asset valuation"}
              chip="bg-[var(--pm-nav-dashboard-bg)] text-[var(--pm-nav-dashboard-color)]"
              icon={<LuTrendingUp className="h-4 w-4" aria-hidden="true" />}
              delay="0ms"
            />
            <Metric
              label="Invested capital"
              amount={data.metrics.investedCapital}
              note="Historical principal deployed"
              chip="bg-[var(--pm-nav-ledger-bg)] text-[var(--pm-nav-ledger-color)]"
              icon={<LuWallet className="h-4 w-4" aria-hidden="true" />}
              delay="80ms"
            />
            <Metric
              label="Current valuation"
              amount={data.metrics.currentValuation}
              note="Latest calculated market value"
              chip="bg-[var(--pm-nav-holdings-bg)] text-[var(--pm-nav-holdings-color)]"
              icon={<LuChartColumn className="h-4 w-4" aria-hidden="true" />}
              delay="160ms"
            />
            <article className="dash-rise h-full" style={{ animationDelay: "240ms" }}>
              <div className={`${cardClass} dash-card h-full p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7B8794]">Realized / unrealized P&L</p>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-statements-bg)] text-[var(--pm-nav-statements-color)]">
                    <LuChartColumn className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs text-[#7B8794]">Realized</p>
                    <CountedPnl value={data.metrics.realizedPnl} />
                  </div>
                  <div>
                    <p className="text-xs text-[#7B8794]">Unrealized</p>
                    <CountedPnl value={data.metrics.unrealizedPnl} />
                    <p className="mt-1 text-xs text-[#7B8794]">After one year, units at the newest completed NAV minus current value</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
          <div className="dash-rise" style={{ animationDelay: "280ms" }} key={client || "all"}>
            <PortfolioCharts trend={data.trend} holdings={data.holdings} />
          </div>
          <div className="dash-rise mt-4" style={{ animationDelay: "360ms" }}>
            <NavChart points={data.nav ?? []} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#8B95A5]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useCountUp(target: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 900;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

function CountedPnl({ value }: { value: number }) {
  return <PnlValue value={useCountUp(value)} />;
}

function Metric({
  label,
  amount,
  note,
  icon,
  chip,
  delay,
}: {
  label: string;
  amount: number;
  note: string;
  icon: ReactNode;
  chip: string;
  delay: string;
}) {
  const shown = useCountUp(amount);
  return (
    <article className="dash-rise h-full" style={{ animationDelay: delay }}>
      <div className={`${cardClass} dash-card h-full p-5`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7B8794]">{label}</p>
          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${chip}`}>{icon}</span>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-[#16324F] tabular-nums">{formatInr(shown)}</p>
        <p className="mt-1 text-sm text-[#7B8794]">{note}</p>
      </div>
    </article>
  );
}
