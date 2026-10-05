"use client";

import { FormEvent, useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui/classes";
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

  return (
    <div className="w-full">
      {status === "loading" ? <Skeleton className="h-40" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" ? (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] text-sm">
          {data?.schedules.map((rule) => (
            <li key={rule.id} className="px-4 py-3">
              <p className="font-medium capitalize">{rule.frequency} · {rule.target}</p>
              <p className="text-muted">Retries {rule.retries} · {rule.preventDuplicates ? "Duplicates blocked" : "Duplicates allowed"}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] p-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className={labelClass}>Frequency</span>
          <select name="frequency" className={inputClass} defaultValue="monthly">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="text-sm">
          <span className={labelClass}>Target</span>
          <input name="target" placeholder="all-active or a client code" className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Retries</span>
          <input name="retries" type="number" min={0} defaultValue={2} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 text-sm sm:mt-7">
          <input name="preventDuplicates" type="checkbox" defaultChecked />
          Prevent duplicate sends
        </label>
        {message ? <p className="text-sm text-primary sm:col-span-2">{message}</p> : null}
        <button type="submit" className={`${primaryButtonClass} sm:w-fit`}>Save schedule</button>
      </form>
    </div>
  );
}
