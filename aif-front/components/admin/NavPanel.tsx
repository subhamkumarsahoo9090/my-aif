"use client";

import { FormEvent, useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import DateField from "@/components/ui/DateField";
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
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className={`${cardClass} p-5`}>
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">1</span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
            <ChartIcon />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Add NAV</h2>
            <p className="text-xs text-[#7B8794]">Holdings use the latest saved NAV for market value.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">
              NAV date<span className="text-[#F97316]"> *</span>
            </span>
            <DateField name="date" required max={todayIso()} value={date} onChange={setDate} className={`${fieldClass} pr-10!`} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">
              NAV<span className="text-[#F97316]"> *</span>
            </span>
            <input name="nav" type="number" min="0.0001" step="0.0001" required placeholder="1140.25" className={fieldClass} />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" className={orangeButtonClass} disabled={pending}>
            {pending ? "Saving..." : "Add NAV"}
          </button>
        </div>
      </form>

      {message ? <p className={`${cardClass} px-5 py-3 text-sm text-[#16324F]`}>{message}</p> : null}
      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}

      {status === "ready" && data ? (
        <section className={cardClass}>
          <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">2</span>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
              <ChartIcon />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-[#16324F]">NAV history</h2>
              {data.latest ? (
                <p className="text-xs text-[#7B8794]">
                  Latest {formatNav(data.latest.nav)} on {formatDate(data.latest.date)}
                </p>
              ) : (
                <p className="text-xs text-[#7B8794]">No NAV has been added yet. Holdings keep their stored market value until the first NAV is saved.</p>
              )}
            </div>
          </div>
          {data.entries.length === 0 ? (
            <p className="m-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">NAV history will appear here.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 text-right font-medium">NAV</th>
                    <th className="px-5 py-3 font-medium">Added by</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-[#EEF2F6] last:border-0">
                      <td className="whitespace-nowrap px-5 py-3 text-[#16324F]">
                        {formatDate(entry.date)}
                        {data.latest?.id === entry.id ? (
                          <span className="ml-2 rounded-full bg-[#FFF1E6] px-2 py-0.5 text-xs font-medium text-[#F97316]">
                            Latest
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-medium tabular-nums text-[#16324F]">{formatNav(entry.nav)}</td>
                      <td className="px-5 py-3 text-[#3D4C5E]">{entry.addedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EDF5] px-5 py-3 text-sm">
            <p className="text-[#7B8794]">
              Page {data.page} of {data.pages}
              {data.total > 0 ? ` · ${data.total} entries` : ""}
            </p>
            <div className="flex gap-2">
              <button type="button" className={outlineButtonClass} disabled={data.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Previous
              </button>
              <button type="button" className={outlineButtonClass} disabled={data.page >= data.pages} onClick={() => setPage((value) => value + 1)}>
                Next
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white py-2.5 pl-3 pr-3 text-sm text-foreground outline-none placeholder:text-[#9AA3AF] focus:border-[#F97316]";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C] disabled:cursor-not-allowed disabled:opacity-60";
const outlineButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#D5DDE6] bg-white px-4 py-2 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50";

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 19V5M5 19h14" strokeLinecap="round" />
      <path d="M8 15v-3M12 15V8M16 15v-5" strokeLinecap="round" />
    </svg>
  );
}
