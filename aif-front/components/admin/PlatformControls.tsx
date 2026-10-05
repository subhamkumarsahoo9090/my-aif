"use client";

import { FormEvent, useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui/classes";
import { api, apiFetch } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";

type Platform = {
  kra: { endpoint: string; token: string; timeoutSeconds: number };
  securities: Array<{ identifier: string; name: string; isin: string }>;
  schedules: unknown[];
};

export default function PlatformControls() {
  const { data, status, reload } = usePortalResource<Platform>(api.admin.platform);
  const clients = usePortalResource<{ clients: Array<{ code: string; name: string }> }>(api.admin.clients);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingOverride, setPendingOverride] = useState<FormData | null>(null);

  async function post(body: Record<string, unknown>) {
    const response = await apiFetch(api.admin.platform, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? "Saved." : payload.message ?? "The change could not be saved.");
    if (response.ok) reload();
    return response.ok;
  }

  async function onKra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    await post({ action: "kra", ...fields, timeoutSeconds: Number(fields.timeoutSeconds) });
  }

  async function onSecurity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await post({ action: "security", ...Object.fromEntries(new FormData(form).entries()) });
    form.reset();
  }

  async function confirmOverride() {
    if (!pendingOverride) return;
    const fields = Object.fromEntries(pendingOverride.entries());
    const ok = await post({ action: "override", ...fields, amount: Number(fields.amount) });
    if (ok) setPendingOverride(null);
  }

  return (
    <div className="w-full space-y-6">
      {status === "loading" ? <Skeleton className="h-40" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {status === "ready" && data ? (
        <>
          <form onSubmit={onKra} className="grid gap-4 rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] p-4 sm:grid-cols-3">
            <h2 className="text-sm font-medium text-primary sm:col-span-3">KRA provider</h2>
            <label className="text-sm sm:col-span-2">
              <span className={labelClass}>Endpoint</span>
              <input name="endpoint" defaultValue={data.kra.endpoint} className={inputClass} />
            </label>
            <label className="text-sm">
              <span className={labelClass}>Timeout seconds</span>
              <input name="timeoutSeconds" type="number" defaultValue={data.kra.timeoutSeconds} className={inputClass} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className={labelClass}>Token</span>
              <input name="token" defaultValue={data.kra.token} className={inputClass} />
            </label>
            <button type="submit" className={`${primaryButtonClass} sm:mt-6 sm:w-fit`}>Save KRA</button>
          </form>

          <section className="rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] p-4">
            <h2 className="text-sm font-medium text-primary">Security master</h2>
            <table className="mt-3 min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--pm-card-mint-color)]">
                <tr>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">ISIN</th>
                </tr>
              </thead>
              <tbody>
                {data.securities.map((security) => (
                  <tr key={security.identifier} className="border-t border-border">
                    <td className="py-2">{security.identifier}</td>
                    <td className="py-2">{security.name}</td>
                    <td className="py-2">{security.isin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form onSubmit={onSecurity} className="mt-4 grid gap-3 sm:grid-cols-4">
              <input name="identifier" placeholder="Symbol" required className={inputClass} />
              <input name="name" placeholder="Name" required className={inputClass} />
              <input name="isin" placeholder="ISIN" className={inputClass} />
              <button type="submit" className={primaryButtonClass}>Add security</button>
            </form>
          </section>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPendingOverride(new FormData(event.currentTarget));
            }}
            className="grid gap-4 rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] p-4 sm:grid-cols-2"
          >
            <h2 className="text-sm font-medium text-primary sm:col-span-2">Ledger override</h2>
            <label className="text-sm">
              <span className={labelClass}>Client</span>
              <select name="clientCode" required className={inputClass}>
                <option value="">Select client</option>
                {(clients.data?.clients ?? []).map((client) => (
                  <option key={client.code} value={client.code}>{client.name} ({client.code})</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className={labelClass}>Date</span>
              <input name="date" type="date" required className={inputClass} />
            </label>
            <label className="text-sm">
              <span className={labelClass}>Type</span>
              <select name="type" className={inputClass} defaultValue="debit">
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </label>
            <label className="text-sm">
              <span className={labelClass}>Amount</span>
              <input name="amount" type="number" min="1" required className={inputClass} />
            </label>
            <label className="text-sm">
              <span className={labelClass}>Narration</span>
              <input name="narration" required className={inputClass} />
            </label>
            <label className="text-sm">
              <span className={labelClass}>Reason</span>
              <input name="reason" required className={inputClass} />
            </label>
            <button type="submit" className={`${primaryButtonClass} sm:w-fit`}>Review override</button>
          </form>
        </>
      ) : null}
      {pendingOverride ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Confirm ledger override</h2>
            <p className="mt-2 text-sm text-muted">This correction is written to the client ledger and kept in the audit log.</p>
            <div className="mt-4 flex gap-3">
              <button type="button" className={primaryButtonClass} onClick={() => void confirmOverride()}>Confirm</button>
              <button type="button" className="text-sm text-muted" onClick={() => setPendingOverride(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
