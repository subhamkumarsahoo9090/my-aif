"use client";

import LoadError from "@/components/ui/LoadError";
import PnlValue from "@/components/ui/PnlValue";
import Skeleton from "@/components/ui/Skeleton";
import { formatDate, formatInr, formatNav, formatQuantity } from "@/lib/format";
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

  const allotment = Boolean(data?.rows?.some((row) => row.allotmentDate || row.pan));

  return (
    <div className="w-full">
      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}

      {status === "ready" && data ? (
        <section className={cardClass}>
          <div className="flex items-center gap-3 px-5 pt-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-[#2E5FA5]">
              <GridIcon />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#16324F]">Holdings</h2>
              <p className="text-xs text-[#7B8794]">
                {data.rows.length === 0
                  ? `No units allotted for ${data.clientCode}`
                  : data.latestNav != null && !allotment
                    ? `${data.rows.length} holding${data.rows.length === 1 ? "" : "s"} · latest NAV ${formatNav(data.latestNav)}`
                    : `${data.rows.length} allotment${data.rows.length === 1 ? "" : "s"} for ${data.clientCode}`}
              </p>
            </div>
          </div>
          {data.rows.length === 0 ? (
            <p className="m-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">
              No holdings yet. When units are allotted to your account, they will be listed here.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <caption className="sr-only">Fund holdings for {data.clientCode}</caption>
                <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
                  {allotment ? (
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Sr. No.</th>
                      <th scope="col" className="px-5 py-3 font-medium">ISIN</th>
                      <th scope="col" className="px-5 py-3 font-medium">Description</th>
                      <th scope="col" className="px-5 py-3 font-medium">Allotment date</th>
                      <th scope="col" className="px-5 py-3 font-medium">Allottee</th>
                      <th scope="col" className="px-5 py-3 font-medium">PAN</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Units</th>
                    </tr>
                  ) : (
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Security identifier</th>
                      <th scope="col" className="px-5 py-3 font-medium">Name</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Quantity (units)</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">NAV</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Market value</th>
                      <th scope="col" className="px-5 py-3 font-medium">P&L</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {data.rows.map((row) => {
                    if (row.allotmentDate || row.pan) {
                      return (
                        <tr key={row.id} className="border-b border-[#EEF2F6] last:border-0">
                          <td className="whitespace-nowrap px-5 py-3 text-[#16324F]">{row.srNo || "—"}</td>
                          <td className="whitespace-nowrap px-5 py-3 font-medium text-[#16324F]">{row.identifier}</td>
                          <td className="min-w-56 px-5 py-3 text-[#3D4C5E]">{row.name}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{row.allotmentDate ? formatDate(row.allotmentDate) : "—"}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-[#16324F]">{row.allotteeName || "—"}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{row.pan || "—"}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">{formatQuantity(row.quantity)}</td>
                        </tr>
                      );
                    }
                    const nav = rowNav(row, data.latestNav);
                    const marketValue = Math.round(row.quantity * nav * 100) / 100;
                    const pnl = Math.round((marketValue - row.quantity * row.averageCost) * 100) / 100;
                    return (
                      <tr key={row.id} className="border-b border-[#EEF2F6] last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-[#16324F]">{row.identifier}</td>
                        <td className="min-w-56 px-5 py-3 text-[#3D4C5E]">{row.name}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">
                          {formatQuantity(row.quantity)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">
                          {formatNav(nav)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">
                          {formatInr(marketValue)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <PnlValue value={pnl} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
    </svg>
  );
}

function rowNav(row: Holding, latestNav: number | null) {
  if (latestNav != null && Number.isFinite(latestNav)) return latestNav;
  if (!row.quantity) return 0;
  return row.marketValue / row.quantity;
}
