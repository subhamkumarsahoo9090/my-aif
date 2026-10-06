"use client";

import { FormEvent, useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/format";
import { api } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";

type Entry = {
  id: string;
  at: string;
  actor: string;
  userId: string;
  action: string;
  targetEntity: string;
  entityId: string;
  detail: string;
  clientCode: string;
};

export default function AuditPanel() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [query, setQuery] = useState("");
  const { data, status, reload } = usePortalResource<{ audit: Entry[] }>(
    `${api.admin.audit}${query ? `?${query}` : ""}`,
  );

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (actor.trim()) params.set("actor", actor.trim());
    if (action.trim()) params.set("action", action.trim());
    if (entity.trim()) params.set("entity", entity.trim());
    setQuery(params.toString());
  }

  const rows = data?.audit ?? [];

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={applyFilters} className={`${cardClass} p-5`}>
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">1</span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
            <SearchIcon />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Filter the log</h2>
            <p className="text-xs text-[#7B8794]">Narrow entries by person, action, or the record that changed.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">User</span>
            <input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="User or name" className={fieldClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Action</span>
            <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Action" className={fieldClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Entity</span>
            <input value={entity} onChange={(event) => setEntity(event.target.value)} placeholder="Entity or id" className={fieldClass} />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" className={orangeButtonClass}>Filter</button>
        </div>
      </form>

      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" ? (
        <section className={cardClass}>
          <div className="flex items-center gap-3 px-5 pt-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">2</span>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
              <ClockIcon />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#16324F]">Audit trail</h2>
              <p className="text-xs text-[#7B8794]">High-privilege actions recorded for this fund.</p>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="m-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No audit entries match this filter.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Log</th>
                    <th className="px-5 py-3 font-medium">When</th>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">Entity</th>
                    <th className="px-5 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <tr key={entry.id} className="border-b border-[#EEF2F6] last:border-0">
                      <td className="px-5 py-3 font-medium text-[#2E5FA5]">{entry.id}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{formatDate(entry.at.slice(0, 10))}</td>
                      <td className="px-5 py-3 text-[#16324F]">{entry.userId || entry.actor}</td>
                      <td className="px-5 py-3 text-[#16324F]">{entry.action}</td>
                      <td className="px-5 py-3 text-[#3D4C5E]">{entry.targetEntity} {entry.entityId}</td>
                      <td className="px-5 py-3 text-[#3D4C5E]">{entry.detail}</td>
                    </tr>
                  ))}
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
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white py-2.5 pl-3 pr-3 text-sm text-foreground outline-none placeholder:text-[#9AA3AF] focus:border-[#F97316]";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C]";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" strokeLinecap="round" />
    </svg>
  );
}
