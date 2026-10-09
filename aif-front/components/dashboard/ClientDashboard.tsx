"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  LuChartColumn,
  LuFileText,
  LuList,
  LuShieldCheck,
  LuTrendingUp,
  LuWallet,
} from "react-icons/lu";
import PortfolioCharts from "@/components/dashboard/PortfolioCharts";
import LoadError from "@/components/ui/LoadError";
import PnlValue from "@/components/ui/PnlValue";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { useApp } from "@/context/AppProvider";
import { downloadBlob, loadStatementFile } from "@/lib/files";
import { formatDate, formatInr } from "@/lib/format";
import { api } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";
import type { LedgerRow, PortfolioMetrics, StatementMeta } from "@/lib/types";

type Summary = {
  clientCode: string;
  kraStatus: "verified" | "pending";
  metrics: PortfolioMetrics;
  recentTransactions: LedgerRow[];
  latestStatement: StatementMeta | null;
  holdings: Array<{ name: string; marketValue: number }>;
  trend: Array<{ date: string; label: string; value: number }>;
};

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.04)]";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C] disabled:cursor-not-allowed disabled:opacity-60";

export default function ClientDashboard() {
  const { pushToast } = useApp();
  const { data, status, reload } = usePortalResource<Summary>(api.portal.summary);
  const [downloading, setDownloading] = useState(false);

  async function downloadLatest(statement: StatementMeta) {
    setDownloading(true);
    try {
      const file = await loadStatementFile(statement.id);
      downloadBlob(file.fileName, file.blob);
    } catch {
      pushToast("The statement could not be downloaded. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="w-full">
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
              note="Current aggregate asset valuation"
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
                </div>
              </div>
              </div>
            </article>
          </div>

          <div className="dash-rise" style={{ animationDelay: "280ms" }}>
            <PortfolioCharts trend={data.trend} holdings={data.holdings} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="dash-rise lg:col-span-2" style={{ animationDelay: "360ms" }}>
              <div className={`${cardClass} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-dashboard-bg)] text-[var(--pm-nav-dashboard-color)]">
                    <LuList className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#16324F]">Recent transactions</h2>
                    <p className="text-xs text-[#7B8794]">Latest ledger debits and credits</p>
                  </div>
                </div>
                <Link href="/ledger" className="text-sm font-semibold text-[var(--pm-nav-dashboard-color)] hover:text-[#1B3C6C]">
                  View ledger
                </Link>
              </div>
              {data.recentTransactions.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">
                  No transactions yet. Capital activity will appear here once the fund posts entries to your ledger.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.recentTransactions.map((row, index) => (
                    <li
                      key={row.id}
                      className="dash-rise flex flex-col gap-2 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      style={{ animationDelay: `${420 + index * 70}ms` }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#16324F]">{row.narration}</p>
                        <p className="text-xs text-[#7B8794]">{formatDate(row.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={row.type === "credit" ? "success" : "neutral"}>
                          {row.type === "credit" ? "Credit" : "Debit"}
                        </StatusBadge>
                        <span className="text-sm font-semibold tabular-nums text-[#16324F]">
                          {formatInr(row.amount)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </section>

            <div className="flex flex-col gap-4">
              <section className="dash-rise" style={{ animationDelay: "420ms" }}>
                <div className={`${cardClass} dash-card p-5`}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-statements-bg)] text-[var(--pm-nav-statements-color)]">
                    <LuFileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#16324F]">Latest statement</h2>
                    <p className="text-xs text-[#7B8794]">Most recent published PDF</p>
                  </div>
                </div>
                {data.latestStatement ? (
                  <>
                    <p className="mt-4 text-sm font-semibold text-[#16324F]">{data.latestStatement.period}</p>
                    <p className="mt-1 text-xs text-[#7B8794]">Issued {formatDate(data.latestStatement.issuedOn)}</p>
                    <button
                      type="button"
                      className={`${orangeButtonClass} mt-4`}
                      disabled={downloading}
                      onClick={() => {
                        if (data.latestStatement) void downloadLatest(data.latestStatement);
                      }}
                    >
                      {downloading ? "Downloading..." : "Download PDF"}
                    </button>
                  </>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">
                    No statement yet. The current cycle statement will show up here when it is published.
                  </p>
                )}
                </div>
              </section>

              <section className="dash-rise" style={{ animationDelay: "500ms" }}>
                <div className={`${cardClass} dash-card p-5`}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-profile-bg)] text-[var(--pm-nav-profile-color)]">
                    <LuShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#16324F]">KRA status</h2>
                    <p className="text-xs text-[#7B8794]">Trading code {data.clientCode}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <StatusBadge tone={data.kraStatus === "verified" ? "success" : "warning"}>
                    {data.kraStatus === "verified" ? "Verified" : "Pending"}
                  </StatusBadge>
                </div>
                </div>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
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

