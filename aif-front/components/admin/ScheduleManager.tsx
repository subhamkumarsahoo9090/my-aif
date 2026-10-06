"use client";

import { FormEvent, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { api, apiFetch } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";

type Rule = {
  id: string;
  frequency: string;
  target: string;
  retries: number;
  preventDuplicates: boolean;
};

export default function ScheduleManager() {
  const { data, status, reload } = usePortalResource<{ schedules: Rule[] }>(api.admin.platform);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    const response = await apiFetch(api.admin.platform, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "schedule",
        ...fields,
        retries: Number(fields.retries),
        preventDuplicates: fields.preventDuplicates === "on",
      }),
    });
    setMessage(response.ok ? "Schedule saved." : "The schedule could not be saved.");
    if (response.ok) {
      form.reset();
      reload();
    }
  }

  const rules = data?.schedules ?? [];

  return (
    <div className="flex flex-col gap-4">
      {message ? <p className={`${cardClass} px-5 py-3 text-sm text-[#16324F]`}>{message}</p> : null}
      {status === "loading" ? <Skeleton className="h-40" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" ? (
        <section className={cardClass}>
          <div className="flex items-center gap-3 px-5 pt-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">1</span>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
              <CalendarIcon />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#16324F]">Statement schedules</h2>
              <p className="text-xs text-[#7B8794]">How often statements go out, and how failures are retried.</p>
            </div>
          </div>
          {rules.length === 0 ? (
            <p className="m-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No schedules yet.</p>
          ) : (
            <ul className="space-y-2 p-5">
              {rules.map((rule) => (
                <li key={rule.id} className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-sm font-semibold capitalize text-[#16324F]">{rule.frequency} · {rule.target}</p>
                  <p className="mt-1 text-xs text-[#7B8794]">Retries {rule.retries} · {rule.preventDuplicates ? "Duplicates blocked" : "Duplicates allowed"}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <form onSubmit={onSubmit} className={`${cardClass} p-5`}>
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">2</span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
            <CalendarIcon />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Save schedule</h2>
            <p className="text-xs text-[#7B8794]">Set the cadence, who receives the statement, and how many retries to allow.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Frequency" required>
            <Select name="frequency" defaultValue="monthly">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </Field>
          <Field label="Target">
            <input name="target" placeholder="all-active or a client code" className={fieldClass} />
          </Field>
          <Field label="Retries">
            <input name="retries" type="number" min={0} defaultValue={2} className={fieldClass} />
          </Field>
          <label className="flex items-end gap-2 pb-2.5 text-sm font-medium text-[#1B3C6C]">
            <input name="preventDuplicates" type="checkbox" defaultChecked className="h-4 w-4 accent-[#F97316]" />
            Prevent duplicate sends
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" className={orangeButtonClass}>Save schedule</button>
        </div>
      </form>
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
    <label className="block text-sm">
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

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" strokeLinecap="round" />
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
