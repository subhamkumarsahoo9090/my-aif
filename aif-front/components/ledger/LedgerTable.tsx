"use client";

import { useMemo, useState } from "react";
import { LuList, LuSlidersHorizontal } from "react-icons/lu";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import DateField from "@/components/ui/DateField";
import { downloadBlob } from "@/lib/files";
import { formatDate, formatInr } from "@/lib/format";
import { api } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";
import type { LedgerRow } from "@/lib/types";

type LedgerResponse = {
  clientCode: string;
  rows: LedgerRow[];
};

function csvCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const cardClass = "rounded-2xl border border-[#E6EDF5] shadow-[0_8px_24px_rgba(20,50,90,0.04)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#F97316]";
const outlineButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#D5DDE6] bg-white px-4 py-2.5 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C] disabled:cursor-not-allowed disabled:opacity-60";

function debitAmount(row: LedgerRow) {
  return row.type === "debit" ? row.amount : "";
}

function creditAmount(row: LedgerRow) {
  return row.type === "credit" ? row.amount : "";
}

export default function LedgerTable() {
  const { data, status, reload } = usePortalResource<LedgerResponse>(api.portal.ledger);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const rangeError =
    start && end && start > end
      ? "The start date must be on or before the end date."
      : null;

  const visible = useMemo(() => {
    if (!data || rangeError) return [];
    return data.rows.filter((row) => {
      if (start && row.date < start) return false;
      if (end && row.date > end) return false;
      return true;
    });
  }, [data, start, end, rangeError]);

  function exportCsv() {
    if (!data) return;
    const header = ["Date", "Type", "Debit", "Credit", "Balance", "Narration"];
    const lines = [
      header.join(","),
      ...visible.map((row) =>
        [
          row.date,
          row.type,
          debitAmount(row),
          creditAmount(row),
          row.balance,
          csvCell(row.narration),
        ].join(","),
      ),
    ];
    downloadBlob(
      `${data.clientCode}-ledger.csv`,
      new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }),
    );
  }

  function exportExcel() {
    if (!data) return;
    const head = ["Date", "Type", "Debit", "Credit", "Balance", "Narration"]
      .map((cell) => `<th>${cell}</th>`)
      .join("");
    const body = visible
      .map((row) => {
        const cells = [
          row.date,
          row.type,
          debitAmount(row),
          creditAmount(row),
          row.balance,
          escapeHtml(row.narration),
        ];
        return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
    downloadBlob(
      `${data.clientCode}-ledger.xls`,
      new Blob([html], { type: "application/vnd.ms-excel" }),
    );
  }

  return (
    <div className="w-full">
      {status === "loading" ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-16" />
          <Skeleton className="h-72" />
        </div>
      ) : null}

      {status === "error" ? <LoadError onRetry={reload} /> : null}

      {status === "ready" && data ? (
        <div className="flex flex-col gap-4">
          <form className={`${cardClass} bg-white p-5`}>
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-ledger-bg)] text-[var(--pm-nav-ledger-color)]">
                <LuSlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-[#16324F]">Filter the ledger</h2>
                <p className="text-xs text-[#7B8794]">Trading code {data.clientCode}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="w-full text-sm sm:w-52" htmlFor="ledger-start">
                <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Start date</span>
                <DateField id="ledger-start" value={start} onChange={setStart} className={`${fieldClass} pr-10!`} />
              </label>
              <label className="w-full text-sm sm:w-52" htmlFor="ledger-end">
                <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">End date</span>
                <DateField id="ledger-end" value={end} onChange={setEnd} className={`${fieldClass} pr-10!`} />
              </label>
              <button
                type="button"
                className={`${outlineButtonClass} w-full sm:w-auto`}
                onClick={() => {
                  setStart("");
                  setEnd("");
                }}
              >
                Clear
              </button>
              <button type="button" className={`${outlineButtonClass} w-full sm:w-auto`} disabled={visible.length === 0} onClick={exportCsv}>
                Export CSV
              </button>
              <button type="button" className={`${orangeButtonClass} w-full sm:w-auto`} disabled={visible.length === 0} onClick={exportExcel}>
                Export Excel
              </button>
            </div>
          </form>

          {rangeError ? (
            <p className="rounded-2xl border border-[#F6D5D5] bg-[#FFF6F6] px-4 py-3 text-sm text-danger" role="alert">
              {rangeError}
            </p>
          ) : (
            <section className={`${cardClass} bg-white`}>
              <div className="flex items-center gap-3 px-5 pt-5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-ledger-bg)] text-[var(--pm-nav-ledger-color)]">
                  <LuList className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-[#16324F]">Transactions</h2>
                  <p className="text-xs text-[#7B8794]">
                    {visible.length} transaction{visible.length === 1 ? "" : "s"} for {data.clientCode}
                  </p>
                </div>
              </div>
              {visible.length === 0 ? (
                <p className="m-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">
                  No transactions in this range. Choose a different start or end date, or clear the filter to see the full ledger.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <caption className="sr-only">Investor ledger</caption>
                    <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-medium">Date</th>
                        <th scope="col" className="px-5 py-3 font-medium">Type</th>
                        <th scope="col" className="px-5 py-3 text-right font-medium">Debit</th>
                        <th scope="col" className="px-5 py-3 text-right font-medium">Credit</th>
                        <th scope="col" className="px-5 py-3 text-right font-medium">Balance</th>
                        <th scope="col" className="px-5 py-3 font-medium">Narration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row) => (
                        <tr key={row.id} className="border-b border-[#EEF2F6] last:border-0">
                          <td className="whitespace-nowrap px-5 py-3 text-[#16324F]">{formatDate(row.date)}</td>
                          <td className="px-5 py-3">
                            <StatusBadge tone={row.type === "credit" ? "success" : "neutral"}>
                              {row.type === "credit" ? "Credit" : "Debit"}
                            </StatusBadge>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">
                            {row.type === "debit" ? formatInr(row.amount) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">
                            {row.type === "credit" ? formatInr(row.amount) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-medium text-[#16324F]">
                            {formatInr(row.balance)}
                          </td>
                          <td className="min-w-56 px-5 py-3 text-[#3D4C5E]">{row.narration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}

