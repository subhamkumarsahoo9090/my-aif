"use client";

import { useCallback, useEffect, useState } from "react";
import { LuFileText } from "react-icons/lu";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { useApp } from "@/context/AppProvider";
import { downloadBlob, loadStatementFile } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { api } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";
import type { StatementMeta } from "@/lib/types";

type StatementResponse = {
  clientCode: string;
  rows: StatementMeta[];
};

type Preview = {
  period: string;
  fileName: string;
  url: string;
};

export default function StatementHistory() {
  const { pushToast } = useApp();
  const { data, status, reload } = usePortalResource<StatementResponse>(
    api.portal.statements,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const closePreview = useCallback(() => {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!preview) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closePreview();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, closePreview]);

  async function run(
    statement: StatementMeta,
    action: "download" | "preview",
  ) {
    setBusyId(`${action}-${statement.id}`);
    try {
      const file = await loadStatementFile(statement.id);
      if (action === "download") {
        downloadBlob(file.fileName, file.blob);
        return;
      }
      const url = URL.createObjectURL(file.blob);
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return { period: statement.period, fileName: file.fileName, url };
      });
    } catch {
      pushToast("The statement could not be downloaded. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full">
      {status === "loading" ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : null}

      {status === "error" ? <LoadError onRetry={reload} /> : null}

      {status === "ready" && data ? (
        <section className="dash-rise" style={{ animationDelay: "0ms" }}>
          <div className={`${cardClass} dash-card bg-white`}>
          <div className="flex items-center gap-3 px-5 pt-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pm-nav-statements-bg)] text-[var(--pm-nav-statements-color)]">
              <LuFileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#16324F]">Statements</h2>
              <p className="text-xs text-[#7B8794]">
                {data.rows.length === 0
                  ? `No statements published for ${data.clientCode}`
                  : `${data.rows.length} statement${data.rows.length === 1 ? "" : "s"} for ${data.clientCode}`}
              </p>
            </div>
          </div>
          {data.rows.length === 0 ? (
            <p className="m-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">
              No statements yet. Published statement periods will be listed here for download and preview.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col px-5 pb-3">
              {data.rows.map((statement, index) => (
                <li
                  key={statement.id}
                  className="dash-rise flex flex-col gap-3 border-b border-[#EEF2F6] px-1 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  style={{ animationDelay: `${120 + Math.min(index, 14) * 50}ms` }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#16324F]">{statement.period}</p>
                    <p className="mt-1 text-xs text-[#7B8794]">Issued {formatDate(statement.issuedOn)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={outlineButtonClass}
                      disabled={busyId === `preview-${statement.id}`}
                      onClick={() => void run(statement, "preview")}
                    >
                      {busyId === `preview-${statement.id}` ? "Opening..." : "Preview"}
                    </button>
                    <button
                      type="button"
                      className={orangeButtonClass}
                      disabled={busyId === `download-${statement.id}`}
                      onClick={() => void run(statement, "download")}
                    >
                      {busyId === `download-${statement.id}` ? "Downloading..." : "Download PDF"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
        </section>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="statement-preview-title"
            className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-lg"
          >
            <div className="flex items-start justify-between gap-3 bg-[#1B3C6C] px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#FDBA74]">WEALTH DISCOVERY</p>
                <h2 id="statement-preview-title" className="text-lg font-semibold text-white">
                  {preview.period}
                </h2>
                <p className="truncate text-xs text-[#D6E4F5]">{preview.fileName}</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                onClick={closePreview}
              >
                Close
              </button>
            </div>
            <iframe title={preview.period} src={`${preview.url}#navpanes=0&view=FitH`} className="min-h-0 flex-1 bg-[#F4F7FB]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] shadow-[0_8px_24px_rgba(20,50,90,0.04)]";
const outlineButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#D5DDE6] bg-white px-4 py-2 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C] disabled:cursor-not-allowed disabled:opacity-60";

