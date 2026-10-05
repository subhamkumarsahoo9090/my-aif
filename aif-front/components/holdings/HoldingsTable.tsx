"use client";

import EmptyState from "@/components/ui/EmptyState";
import LoadError from "@/components/ui/LoadError";
import PnlValue from "@/components/ui/PnlValue";
import Skeleton from "@/components/ui/Skeleton";
import { formatInr, formatNav, formatQuantity } from "@/lib/format";
import { api } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";
import type { Holding } from "@/lib/types";

type HoldingsResponse = {
  clientCode: string;
  rows: Holding[];
  latestNav: number | null;
};

export default function HoldingsTable() {
  const { data, status, reload } = usePortalResource<HoldingsResponse>(
    api.portal.holdings,
  );

  return (
    <div className="w-full">
      {status === "ready" && data?.latestNav != null ? (
        <p className="mb-3 text-sm text-muted">
          Market value is your units multiplied by the latest NAV of {formatNav(data.latestNav)}.
        </p>
      ) : null}

      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}

      {status === "ready" && data && data.rows.length === 0 ? (
        <EmptyState
          title="No holdings yet"
          body="When units are allotted to your account, they will be listed here."
        />
      ) : null}

      {status === "ready" && data && data.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <caption className="sr-only">Fund holdings for {data.clientCode}</caption>
            <thead className="bg-[var(--pm-card-lilac-bg)] text-xs uppercase tracking-wide text-[var(--pm-card-lilac-color)]">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">Security identifier</th>
                <th scope="col" className="px-3 py-3 font-medium">Name</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Quantity (units)</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">NAV</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Market value</th>
                <th scope="col" className="px-3 py-3 font-medium">P&L</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const nav = rowNav(row, data.latestNav);
                const marketValue = Math.round(row.quantity * nav * 100) / 100;
                const pnl = Math.round((marketValue - row.quantity * row.averageCost) * 100) / 100;
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-3 font-medium">{row.identifier}</td>
                    <td className="min-w-56 px-3 py-3">{row.name}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                      {formatQuantity(row.quantity)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                      {formatNav(nav)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                      {formatInr(marketValue)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <PnlValue value={pnl} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function rowNav(row: Holding, latestNav: number | null) {
  if (latestNav != null && Number.isFinite(latestNav)) return latestNav;
  if (!row.quantity) return 0;
  return row.marketValue / row.quantity;
}
