"use client";

import { useState, type ReactNode, type SelectHTMLAttributes } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
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

  const runs = history.data?.runs ?? [];

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(event.currentTarget, "manual");
        }}
        className={`${cardClass} p-5`}
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">1</span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
            <DocIcon />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Generate statement</h2>
            <p className="text-xs text-[#7B8794]">Create a PDF record now, or set a delivery schedule.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Client" required>
            <Select name="clientCode" required defaultValue="">
              <option value="">Select client</option>
              {(clients.data?.clients ?? []).map((client) => (
                <option key={client.code} value={client.code}>{client.name} ({client.code})</option>
              ))}
            </Select>
          </Field>
          <Field label="Statement type" required>
            <Select name="statementType" defaultValue="Capital account">
              <option>Capital account</option>
              <option>Holdings</option>
              <option>Portfolio</option>
            </Select>
          </Field>
          <Field label="Period" required>
            <input name="period" required placeholder="Q2 FY 2026-27" className={fieldClass} />
          </Field>
          <Field label="Schedule">
            <Select name="frequency" defaultValue="monthly">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-[#D5DDE6] bg-white px-5 py-2.5 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC]"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form?.reportValidity()) void send(form, "scheduled");
            }}
          >
            Schedule delivery
          </button>
          <button type="submit" className={orangeButtonClass}>Generate PDF record</button>
        </div>
      </form>

      {message ? <p className={`${cardClass} px-5 py-3 text-sm text-[#16324F]`}>{message}</p> : null}

      <section className={cardClass}>
        <div className="flex items-center gap-3 px-5 pt-5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">2</span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
            <ClockIcon />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Delivery history</h2>
            <p className="text-xs text-[#7B8794]">Statements generated or scheduled for investors.</p>
          </div>
        </div>
        <div className="p-5">
          {history.status === "loading" ? <Skeleton className="h-40" /> : null}
          {history.status === "error" ? <LoadError onRetry={history.reload} /> : null}
          {history.status === "ready" && runs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No statements yet.</p>
          ) : null}
          {history.status === "ready" && runs.length > 0 ? (
            <ul className="space-y-2">
              {runs.map((run) => (
                <li key={run.id} className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-sm font-semibold text-[#16324F]">{run.clientName} · {run.statementType}</p>
                  <p className="mt-1 text-xs text-[#7B8794]">
                    {run.period} · {run.mode} {run.frequency} · {run.status} · {formatDate(run.at.slice(0, 10))}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white py-2.5 pl-3 pr-3 text-sm text-foreground outline-none placeholder:text-[#9AA3AF] focus:border-[#F97316]";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C]";

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">
        {label}
        {required ? <span className="text-[#F97316]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Select({ children, className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...props} className={`${fieldClass} appearance-none pr-10! ${className}`}>
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B95A5]">
        <ChevronDown />
      </span>
    </span>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" strokeLinecap="round" />
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

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
