"use client";

import { useMemo, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  inputClass,
  secondaryButtonClass,
} from "@/components/ui/classes";
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
        <>
          <form className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] sm:flex-row sm:flex-wrap sm:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="ledger-start">
                Start date
              </label>
              <input
                id="ledger-start"
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="ledger-end">
                End date
              </label>
              <input
                id="ledger-end"
                type="date"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setStart("");
                setEnd("");
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={visible.length === 0}
              onClick={exportCsv}
            >
              Export CSV
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={visible.length === 0}
              onClick={exportExcel}
            >
              Export Excel
            </button>
          </form>

          {rangeError ? (
            <p className="mb-4 text-sm text-danger" role="alert">
              {rangeError}
            </p>
          ) : visible.length === 0 ? (
            <>
              <p className="mb-3 text-sm text-muted">
                0 transactions for {data.clientCode}
              </p>
              <EmptyState
                title="No transactions in this range"
                body="Choose a different start or end date, or clear the filter to see the full ledger."
              />
            </>
          ) : (
            <>
            <p className="mb-3 text-sm text-muted">
              {visible.length} transaction{visible.length === 1 ? "" : "s"} for{" "}
              {data.clientCode}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
              <table className="min-w-full border-collapse text-left text-sm">
                <caption className="sr-only">Investor ledger</caption>
                <thead className="bg-[var(--pm-card-blue-bg)] text-xs uppercase tracking-wide text-[var(--pm-card-blue-color)]">
                  <tr>
                    <th scope="col" className="px-3 py-3 font-medium">Date</th>
                    <th scope="col" className="px-3 py-3 font-medium">Type</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Debit</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Credit</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Balance</th>
                    <th scope="col" className="px-3 py-3 font-medium">Narration</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(row.date)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge tone={row.type === "credit" ? "success" : "danger"}>
                          {row.type === "credit" ? "Credit" : "Debit"}
                        </StatusBadge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                        {row.type === "debit" ? formatInr(row.amount) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                        {row.type === "credit" ? formatInr(row.amount) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                        {formatInr(row.balance)}
                      </td>
                      <td className="min-w-56 px-3 py-3">{row.narration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
