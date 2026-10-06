"use client";

import { useCallback, useEffect, useState } from "react";
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
        <section className={cardClass}>
          <div className="flex items-center gap-3 px-5 pt-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-[#2E5FA5]">
              <DocIcon />
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
            <ul className="mt-4 flex flex-col gap-2 px-5 pb-5">
              {data.rows.map((statement) => (
                <li
                  key={statement.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
        </section>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="statement-preview-title"
            className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E6EDF5] bg-white shadow-lg"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#E6EDF5] px-5 py-4">
              <div className="min-w-0">
                <h2 id="statement-preview-title" className="text-lg font-semibold text-[#16324F]">
                  {preview.period}
                </h2>
                <p className="truncate text-xs text-[#7B8794]">{preview.fileName}</p>
              </div>
              <button type="button" className={outlineButtonClass} onClick={closePreview}>
                Close
              </button>
            </div>
            <iframe title={preview.period} src={preview.url} className="min-h-0 flex-1" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const outlineButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#D5DDE6] bg-white px-4 py-2 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C] disabled:cursor-not-allowed disabled:opacity-60";

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5M8 12h8M8 16h6" strokeLinecap="round" />
    </svg>
  );
}
