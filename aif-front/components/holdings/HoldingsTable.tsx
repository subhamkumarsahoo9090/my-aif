"use client";

import { useState } from "react";
import { LuLayoutGrid } from "react-icons/lu";
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
  const [showHoldingCost, setShowHoldingCost] = useState(false);

  const rows = [...(data?.rows ?? [])].sort((left, right) => {
    const earlier = left.allotmentDate ?? "";
    const later = right.allotmentDate ?? "";
    if (earlier === later) return 0;
    if (!earlier) return 1;
    if (!later) return -1;
    return earlier.localeCompare(later);
  });
  const allotment = rows.some((row) => row.allotmentDate || row.pan);
  const purchasePortfolio = purchasePortfolioByHolding(rows);
  const merged = rows.reduce(
    (sum, row) => ({
      units: sum.units + row.quantity,
      pnl: sum.pnl + row.pnl,
    }),
    { units: 0, pnl: 0 },
  );
  const currentPortfolio = data?.latestNav != null ? Math.round(merged.units * data.latestNav * 100) / 100 : null;

  return (
    <div className="w-full">
      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}

      {status === "ready" && data ? (
        <section className="dash-rise" style={{ animationDelay: "0ms" }}>
          <div className={`${cardClass} dash-card bg-white`}>
          <div className="flex items-center gap-3 px-5 pt-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-holdings-bg)] text-[var(--pm-nav-holdings-color)]">
              <LuLayoutGrid className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[#16324F]">Holdings</h2>
              <p className="text-xs text-[#7B8794]">
                {rows.length === 0
                  ? `No units allotted for ${data.clientCode}`
                  : data.latestNav != null && !allotment
                    ? `${rows.length} holding${rows.length === 1 ? "" : "s"} · latest NAV ${formatNav(data.latestNav)}`
                    : `${rows.length} allotment${rows.length === 1 ? "" : "s"} for ${data.clientCode}`}
              </p>
            </div>
            {rows.length > 0 ? (
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#2E5FA5] hover:bg-[#F4F7FB]"
                aria-pressed={showHoldingCost}
                aria-label={showHoldingCost ? "Hide NAV and Purchase Portfolio" : "Show NAV and Purchase Portfolio"}
                onClick={() => setShowHoldingCost((current) => !current)}
              >
                {showHoldingCost ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            ) : null}
          </div>
          {rows.length === 0 ? (
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
                      <th scope="col" className="px-5 py-3 font-medium">ISIN</th>
                      <th scope="col" className="px-5 py-3 font-medium">Description</th>
                      <th scope="col" className="px-5 py-3 font-medium">Allotment date</th>
                      <th scope="col" className="px-5 py-3 font-medium">Allottee</th>
                      <th scope="col" className="px-5 py-3 font-medium">PAN</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Units</th>
                      {showHoldingCost ? <th scope="col" className="px-5 py-3 text-right font-medium">NAV</th> : null}
                      <th scope="col" className="px-5 py-3 text-right font-medium">Current NAV</th>
                      {showHoldingCost ? <th scope="col" className="px-5 py-3 text-right font-medium">Purchase Portfolio</th> : null}
                      <th scope="col" className="px-5 py-3 font-medium">P&L</th>
                    </tr>
                  ) : (
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Security identifier</th>
                      <th scope="col" className="px-5 py-3 font-medium">Name</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Quantity (units)</th>
                      {showHoldingCost ? <th scope="col" className="px-5 py-3 text-right font-medium">NAV</th> : null}
                      <th scope="col" className="px-5 py-3 text-right font-medium">Current NAV</th>
                      {showHoldingCost ? <th scope="col" className="px-5 py-3 text-right font-medium">Purchase Portfolio</th> : null}
                      <th scope="col" className="px-5 py-3 font-medium">P&L</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const rowClass = "dash-row border-b border-[#EEF2F6] last:border-0";
                    const rowStyle = { animationDelay: `${120 + Math.min(index, 14) * 40}ms` };
                    if (row.allotmentDate || row.pan) {
                      return (
                        <tr key={row.id} className={rowClass} style={rowStyle}>
                          <td className="whitespace-nowrap px-5 py-3 font-medium text-[#16324F]">{row.identifier}</td>
                          <td className="min-w-56 px-5 py-3 text-[#3D4C5E]">{row.name}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{row.allotmentDate ? formatDate(row.allotmentDate) : "—"}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-[#16324F]">{row.allotteeName || "—"}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{row.pan || "—"}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">{formatQuantity(row.quantity)}</td>
                          {showHoldingCost ? <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">{row.costNav != null ? formatNav(row.costNav) : "—"}</td> : null}
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">{formatCurrentNav(data.latestNav)}</td>
                          {showHoldingCost ? <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">{formatPortfolio(purchasePortfolio.get(row.id))}</td> : null}
                          <td className="whitespace-nowrap px-5 py-3"><PnlValue value={row.pnl} /></td>
                        </tr>
                      );
                    }
                    const nav = rowNav(row, data.latestNav);
                    const portfolio = purchasePortfolio.get(row.id) ?? Math.round(row.quantity * row.averageCost * 100) / 100;
                    return (
                      <tr key={row.id} className={rowClass} style={rowStyle}>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-[#16324F]">{row.identifier}</td>
                        <td className="min-w-56 px-5 py-3 text-[#3D4C5E]">{row.name}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">
                          {formatQuantity(row.quantity)}
                        </td>
                        {showHoldingCost ? (
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">
                            {formatNav(nav)}
                          </td>
                        ) : null}
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">
                          {formatCurrentNav(data.latestNav)}
                        </td>
                        {showHoldingCost ? (
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">
                            {formatInr(portfolio)}
                          </td>
                        ) : null}
                        <td className="whitespace-nowrap px-5 py-3">
                          <PnlValue value={row.pnl} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {allotment ? (
                  <tfoot>
                    <tr className="border-t border-[#E6EDF5] bg-[#F8FAFC] text-[#16324F]">
                      <td className="px-5 py-3 font-semibold" colSpan={5}>Merged</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums">{formatQuantity(merged.units)}</td>
                      {showHoldingCost ? <td className="px-5 py-3" /> : null}
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums">{formatCurrentNav(data.latestNav)}</td>
                      {showHoldingCost ? <td className="px-5 py-3" /> : null}
                      <td className="whitespace-nowrap px-5 py-3"><PnlValue value={merged.pnl} /></td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          )}
          {rows.length > 0 ? (
            <div className="border-t border-[#E6EDF5] px-5 py-5">
              <p className="text-sm font-medium text-[#7B8794]">Current portfolio value</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-[#16324F]">{currentPortfolio == null ? "—" : formatInr(currentPortfolio)}</p>
              <p className="mt-1 text-xs text-[#7B8794]">Total units × current NAV</p>
            </div>
          ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] shadow-[0_8px_24px_rgba(20,50,90,0.04)]";

function purchasePortfolioByHolding(rows: Holding[]) {
  let units = 0;
  const values = new Map<string, number | null>();
  rows.forEach((row) => {
    units += row.quantity;
    const purchase = row.costNav;
    values.set(row.id, purchase == null || !Number.isFinite(purchase) ? null : Math.round(units * purchase * 100) / 100);
  });
  return values;
}

function formatPortfolio(value: number | null | undefined) {
  return value == null ? "—" : formatInr(value);
}

function formatCurrentNav(value: number | null) {
  return value == null ? "—" : formatNav(value);
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 5.5 20 18.5" strokeLinecap="round" />
      <path d="M9.2 8.2A8 8 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a17 17 0 0 1-3.2 3.6M14.2 14.4A2.5 2.5 0 0 1 9.8 11M6.2 9.1C4.2 10.5 2.5 12 2.5 12S6 17.5 12 17.5c1.2 0 2.3-.3 3.3-.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function rowNav(row: Holding, latestNav: number | null) {
  if (latestNav != null && Number.isFinite(latestNav)) return latestNav;
  if (!row.quantity) return 0;
  return row.marketValue / row.quantity;
}
