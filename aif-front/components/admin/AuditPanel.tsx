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

  return (
    <div className="w-full">
      <form onSubmit={applyFilters} className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
        <input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="User or name" className="rounded-xl border border-border bg-white px-3 py-2 text-sm" />
        <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Action" className="rounded-xl border border-border bg-white px-3 py-2 text-sm" />
        <input value={entity} onChange={(event) => setEntity(event.target.value)} placeholder="Entity or id" className="rounded-xl border border-border bg-white px-3 py-2 text-sm" />
        <button type="submit" className="rounded-xl bg-button px-4 py-2 text-sm text-button-text">Filter</button>
      </form>
      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--pm-card-gold-bg)] text-xs uppercase tracking-wide text-[var(--pm-card-gold-color)]">
              <tr>
                <th className="px-3 py-3 font-medium">Log</th>
                <th className="px-3 py-3 font-medium">When</th>
                <th className="px-3 py-3 font-medium">User</th>
                <th className="px-3 py-3 font-medium">Action</th>
                <th className="px-3 py-3 font-medium">Entity</th>
                <th className="px-3 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {data?.audit.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">{entry.id}</td>
                  <td className="px-3 py-3">{formatDate(entry.at.slice(0, 10))}</td>
                  <td className="px-3 py-3">{entry.userId || entry.actor}</td>
                  <td className="px-3 py-3">{entry.action}</td>
                  <td className="px-3 py-3">{entry.targetEntity} {entry.entityId}</td>
                  <td className="px-3 py-3">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
