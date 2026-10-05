"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import PortfolioCharts from "@/components/dashboard/PortfolioCharts";
import EmptyState from "@/components/ui/EmptyState";
import LoadError from "@/components/ui/LoadError";
import PnlValue from "@/components/ui/PnlValue";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { secondaryButtonClass } from "@/components/ui/classes";
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

const metricTones = {
  blue: "bg-[var(--pm-card-blue-bg)] text-[var(--pm-card-blue-color)]",
  gold: "bg-[var(--pm-card-gold-bg)] text-[var(--pm-card-gold-color)]",
  lilac: "bg-[var(--pm-card-lilac-bg)] text-[var(--pm-card-lilac-color)]",
  mint: "bg-[var(--pm-card-mint-bg)] text-[var(--pm-card-mint-color)]",
} as const;

function MetricCard({
  label,
  tone,
  icon,
  children,
}: {
  label: string;
  tone: keyof typeof metricTones;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className={`flex h-full flex-col rounded-2xl p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] ${metricTones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide">{label}</h2>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80">{icon}</span>
      </div>
      <div className="mt-3">{children}</div>
    </article>
  );
}

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
      {status === "ready" && data ? (
        <p className="mb-4 text-sm font-medium">
          KRA compliance: {data.kraStatus === "verified" ? "Verified" : "Pending"}
        </p>
      ) : null}

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
            <MetricCard label="Total portfolio value" tone="blue" icon={<MetricIcon name="chart" />}>
              <p className="text-2xl font-semibold tabular-nums">
                {formatInr(data.metrics.totalPortfolioValue)}
              </p>
              <p className="mt-1 text-xs opacity-75">Current aggregate asset valuation</p>
            </MetricCard>
            <MetricCard label="Invested capital" tone="gold" icon={<MetricIcon name="wallet" />}>
              <p className="text-2xl font-semibold tabular-nums">
                {formatInr(data.metrics.investedCapital)}
              </p>
              <p className="mt-1 text-xs opacity-75">Historical principal deployed</p>
            </MetricCard>
            <MetricCard label="Current valuation" tone="lilac" icon={<MetricIcon name="trend" />}>
              <p className="text-2xl font-semibold tabular-nums">
                {formatInr(data.metrics.currentValuation)}
              </p>
              <p className="mt-1 text-xs opacity-75">Latest calculated market value</p>
            </MetricCard>
            <MetricCard label="Realized / unrealized P&L" tone="mint" icon={<MetricIcon name="pnl" />}>
              <div className="space-y-3">
                <div>
                  <p className="text-xs opacity-75">Realized</p>
                  <PnlValue value={data.metrics.realizedPnl} />
                </div>
                <div>
                  <p className="text-xs opacity-75">Unrealized</p>
                  <PnlValue value={data.metrics.unrealizedPnl} />
                </div>
              </div>
            </MetricCard>
          </div>

          <PortfolioCharts trend={data.trend} holdings={data.holdings} />

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Recent transactions</h2>
                  <p className="mt-1 text-xs text-muted">Latest ledger debits and credits</p>
                </div>
                <Link href="/ledger" className="text-sm font-semibold text-primary">
                  View ledger
                </Link>
              </div>
              {data.recentTransactions.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No transactions yet"
                    body="Capital activity will appear here once the fund posts entries to your ledger."
                  />
                </div>
              ) : (
                <ul className="mt-2">
                  {data.recentTransactions.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{row.narration}</p>
                        <p className="text-xs text-muted">{formatDate(row.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={row.type === "credit" ? "success" : "danger"}>
                          {row.type === "credit" ? "Credit" : "Debit"}
                        </StatusBadge>
                        <span className="text-sm font-medium tabular-nums">
                          {formatInr(row.amount)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-col gap-4">
              <section className="rounded-2xl bg-[var(--pm-card-lilac-bg)] p-4 text-[var(--pm-card-lilac-color)] shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
                <h2 className="text-sm font-semibold">Latest statement</h2>
                {data.latestStatement ? (
                  <>
                    <p className="mt-3 text-sm font-medium">{data.latestStatement.period}</p>
                    <p className="mt-1 text-xs opacity-75">
                      Issued {formatDate(data.latestStatement.issuedOn)}
                    </p>
                    <button
                      type="button"
                      className={`${secondaryButtonClass} mt-4`}
                      disabled={downloading}
                      onClick={() => {
                        if (data.latestStatement) {
                          void downloadLatest(data.latestStatement);
                        }
                      }}
                    >
                      {downloading ? "Downloading..." : "Download PDF"}
                    </button>
                  </>
                ) : (
                  <div className="mt-4">
                    <EmptyState
                      title="No statement yet"
                      body="The current cycle statement will show up here when it is published."
                    />
                  </div>
                )}
              </section>

              <section className={`rounded-2xl p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] ${data.kraStatus === "verified" ? "bg-[var(--pm-card-mint-bg)] text-[var(--pm-card-mint-color)]" : "bg-[var(--pm-card-gold-bg)] text-[var(--pm-card-gold-color)]"}`}>
                <h2 className="text-sm font-semibold">KRA status</h2>
                <div className="mt-3">
                  <StatusBadge tone={data.kraStatus === "verified" ? "success" : "warning"}>
                    {data.kraStatus === "verified" ? "Verified" : "Pending"}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs opacity-80">
                  Compliance indicator for trading code {data.clientCode}.
                </p>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MetricIcon({ name }: { name: "chart" | "wallet" | "trend" | "pnl" }) {
  const common = { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true } as const;
  if (name === "wallet") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M16 14h2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "trend") {
    return (
      <svg {...common}>
        <path d="M4 16l5-5 3 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 6h5v5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "pnl") {
    return (
      <svg {...common}>
        <path d="M5 19V5M5 19h14" strokeLinecap="round" />
        <path d="M9 14v3M13 10v7M17 7v10" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M7 15l4-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
