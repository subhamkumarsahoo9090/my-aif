"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/classes";
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

      {status === "ready" && data && data.rows.length === 0 ? (
        <EmptyState
          title="No statements yet"
          body="Published statement periods will be listed here for download and preview."
        />
      ) : null}

      {status === "ready" && data && data.rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {data.rows.map((statement) => (
            <li
              key={statement.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{statement.period}</p>
                <p className="mt-1 text-xs text-muted">
                  Issued {formatDate(statement.issuedOn)} · {data.clientCode}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={busyId === `preview-${statement.id}`}
                  onClick={() => void run(statement, "preview")}
                >
                  {busyId === `preview-${statement.id}` ? "Opening..." : "Preview"}
                </button>
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={busyId === `download-${statement.id}`}
                  onClick={() => void run(statement, "download")}
                >
                  {busyId === `download-${statement.id}` ? "Downloading..." : "Download PDF"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="statement-preview-title"
            className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-background shadow-lg"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 id="statement-preview-title" className="text-sm font-medium">
                  {preview.period}
                </h2>
                <p className="text-xs text-muted">{preview.fileName}</p>
              </div>
              <button type="button" className={secondaryButtonClass} onClick={closePreview}>
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
