"use client";

import { useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/classes";
import { formatDate } from "@/lib/format";
import { api, apiFetch } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";

type Run = {
  id: string;
  clientName: string;
  statementType: string;
  period: string;
  mode: string;
  frequency: string;
  status: string;
  at: string;
};

export default function ReportsPanel() {
  const clients = usePortalResource<{ clients: Array<{ code: string; name: string }> }>(api.admin.clients);
  const history = usePortalResource<{ runs: Run[] }>(api.admin.reports);
  const [message, setMessage] = useState<string | null>(null);

  async function send(form: HTMLFormElement, mode: "manual" | "scheduled") {
    const response = await apiFetch(api.admin.reports, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(new FormData(form).entries()), mode }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? (mode === "manual" ? "Statement generated." : "Delivery scheduled.") : data.message ?? "The request failed.");
    if (response.ok) history.reload();
  }

  return (
    <div className="w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(event.currentTarget, "manual");
        }}
        className="grid gap-4 rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] p-4 sm:grid-cols-2"
      >
        <label className="text-sm">
          <span className={labelClass}>Client</span>
          <select name="clientCode" className={inputClass} required>
            <option value="">Select client</option>
            {(clients.data?.clients ?? []).map((client) => (
              <option key={client.code} value={client.code}>{client.name} ({client.code})</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className={labelClass}>Statement type</span>
          <select name="statementType" className={inputClass} defaultValue="Capital account">
            <option>Capital account</option>
            <option>Holdings</option>
            <option>Portfolio</option>
          </select>
        </label>
        <label className="text-sm">
          <span className={labelClass}>Period</span>
          <input name="period" required placeholder="Q2 FY 2026-27" className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Schedule</span>
          <select name="frequency" className={inputClass} defaultValue="monthly">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button type="submit" className={primaryButtonClass}>Generate PDF record</button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form) void send(form, "scheduled");
            }}
          >
            Schedule delivery
          </button>
        </div>
      </form>
      {message ? <p className="mt-3 text-sm text-primary">{message}</p> : null}
      <section className="mt-6">
        {history.status === "loading" ? <Skeleton className="h-40" /> : null}
        {history.status === "error" ? <LoadError onRetry={history.reload} /> : null}
        {history.status === "ready" ? (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] text-sm">
            {history.data?.runs.map((run) => (
              <li key={run.id} className="px-4 py-3">
                <p className="font-medium">{run.clientName} · {run.statementType}</p>
                <p className="text-muted">{run.period} · {run.mode} {run.frequency} · {run.status} · {formatDate(run.at.slice(0, 10))}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
