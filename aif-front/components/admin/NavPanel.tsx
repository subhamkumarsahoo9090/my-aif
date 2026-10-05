"use client";

import { FormEvent, useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/classes";
import { api, apiFetch } from "@/config/endapi";
import { formatDate, formatNav } from "@/lib/format";
import { usePortalResource } from "@/lib/use-portal-resource";

type NavEntry = {
  id: string;
  date: string;
  nav: number;
  addedBy: string;
  addedAt: string;
};

type NavPage = {
  entries: NavEntry[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  latest: NavEntry | null;
};

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function NavPanel() {
  const [page, setPage] = useState(1);
  const [date, setDate] = useState(todayIso);
  const { data, status, reload } = usePortalResource<NavPage>(`${api.admin.nav}?page=${page}`);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    setPending(true);
    setMessage(null);
    const response = await apiFetch(api.admin.nav, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: fields.date, nav: Number(fields.nav) }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setPending(false);
    if (!response.ok) {
      setMessage(payload.message ?? "The NAV could not be saved.");
      return;
    }
    const navField = form.elements.namedItem("nav");
    if (navField instanceof HTMLInputElement) navField.value = "";
    setDate(todayIso());
    setMessage("NAV saved. Client holdings now use this value when it is the latest date.");
    if (page !== 1) setPage(1);
    else reload();
  }

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="mb-6 grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] sm:grid-cols-2">
        <label className="text-sm">
          <span className={labelClass}>NAV date</span>
          <input
            name="date"
            type="date"
            required
            max={todayIso()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          <span className={labelClass}>NAV</span>
          <input name="nav" type="number" min="0.0001" step="0.0001" required placeholder="1140.25" className={inputClass} />
        </label>
        {message ? <p className="text-sm text-primary sm:col-span-2">{message}</p> : null}
        <button type="submit" className={`${primaryButtonClass} sm:w-fit`} disabled={pending}>
          {pending ? "Saving..." : "Add NAV"}
        </button>
      </form>

      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}

      {status === "ready" && data ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
          <div className="border-b border-border px-4 py-3 text-sm">
            {data.latest ? (
              <p>
                Latest NAV <span className="font-semibold">{formatNav(data.latest.nav)}</span>
                <span className="text-muted"> on {formatDate(data.latest.date)}</span>
              </p>
            ) : (
              <p className="text-muted">No NAV has been added yet. Holdings keep their stored market value until the first NAV is saved.</p>
            )}
          </div>
          {data.entries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">NAV history will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--pm-card-blue-bg)] text-xs uppercase tracking-wide text-[var(--pm-card-blue-color)]">
                  <tr>
                    <th className="px-3 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 text-right font-medium">NAV</th>
                    <th className="px-3 py-3 font-medium">Added by</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="whitespace-nowrap px-3 py-3">
                        {formatDate(entry.date)}
                        {data.latest?.id === entry.id ? (
                          <span className="ml-2 rounded-full bg-[var(--pm-card-mint-bg)] px-2 py-0.5 text-xs font-medium text-[var(--pm-card-mint-color)]">
                            Latest
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums font-medium">{formatNav(entry.nav)}</td>
                      <td className="px-3 py-3">{entry.addedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
            <p className="text-muted">
              Page {data.page} of {data.pages}
              {data.total > 0 ? ` · ${data.total} entries` : ""}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={data.page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={data.page >= data.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
