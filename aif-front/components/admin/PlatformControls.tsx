"use client";

import { FormEvent, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import DateField from "@/components/ui/DateField";
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
    <div className="flex flex-col gap-4">
      {status === "loading" ? <Skeleton className="h-40" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {message ? <p className={`${cardClass} px-5 py-3 text-sm text-[#16324F]`}>{message}</p> : null}
      {status === "ready" && data ? (
        <>
          <form onSubmit={onKra} className={`${cardClass} p-5`}>
            <SectionHeading index="1" icon={<LinkIcon />} title="KRA provider" subtitle="Endpoint, token, and timeout used for KYC checks." />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Endpoint" className="md:col-span-2">
                <input name="endpoint" defaultValue={data.kra.endpoint} placeholder="https://" className={fieldClass} />
              </Field>
              <Field label="Timeout seconds">
                <input name="timeoutSeconds" type="number" defaultValue={data.kra.timeoutSeconds} className={fieldClass} />
              </Field>
              <Field label="Token">
                <input name="token" defaultValue={data.kra.token} className={fieldClass} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="submit" className={orangeButtonClass}>Save KRA</button>
            </div>
          </form>

          <section className={cardClass}>
            <div className="px-5 pt-5">
              <SectionHeading index="2" icon={<GridIcon />} title="Security master" subtitle="Symbols used when holdings are imported." />
            </div>
            {data.securities.length === 0 ? (
              <p className="mx-5 mb-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No securities yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Symbol</th>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">ISIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.securities.map((security) => (
                      <tr key={security.identifier} className="border-b border-[#EEF2F6] last:border-0">
                        <td className="px-5 py-3 font-medium text-[#2E5FA5]">{security.identifier}</td>
                        <td className="px-5 py-3 text-[#16324F]">{security.name}</td>
                        <td className="px-5 py-3 text-[#3D4C5E]">{security.isin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form onSubmit={onSecurity} className="grid gap-3 p-5 md:grid-cols-4">
              <input name="identifier" placeholder="Symbol" required className={fieldClass} />
              <input name="name" placeholder="Name" required className={fieldClass} />
              <input name="isin" placeholder="ISIN" className={fieldClass} />
              <button type="submit" className={orangeButtonClass}>Add security</button>
            </form>
          </section>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPendingOverride(new FormData(event.currentTarget));
            }}
            className={`${cardClass} p-5`}
          >
            <SectionHeading index="3" icon={<ListIcon />} title="Ledger override" subtitle="Post a corrected debit or credit and keep it in the audit log." />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Client" required>
                <Select name="clientCode" required defaultValue="">
                  <option value="">Select client</option>
                  {(clients.data?.clients ?? []).map((client) => (
                    <option key={client.code} value={client.code}>{client.name} ({client.code})</option>
                  ))}
                </Select>
              </Field>
              <Field label="Date" required>
                <DateField name="date" required className={`${fieldClass} pr-10!`} />
              </Field>
              <Field label="Type" required>
                <Select name="type" defaultValue="debit">
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </Select>
              </Field>
              <Field label="Amount" required>
                <input name="amount" type="number" min="1" required placeholder="0" className={fieldClass} />
              </Field>
              <Field label="Narration" required>
                <input name="narration" required placeholder="What this entry is for" className={fieldClass} />
              </Field>
              <Field label="Reason" required>
                <input name="reason" required placeholder="Why this correction is needed" className={fieldClass} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="submit" className={orangeButtonClass}>Review override</button>
            </div>
          </form>
        </>
      ) : null}
      {pendingOverride ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[#E6EDF5] bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#16324F]">Confirm ledger override</h2>
            <p className="mt-2 text-sm text-[#7B8794]">This correction is written to the client ledger and kept in the audit log.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={outlineButtonClass} onClick={() => setPendingOverride(null)}>Cancel</button>
              <button type="button" className={orangeButtonClass} onClick={() => void confirmOverride()}>Confirm</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white py-2.5 pl-3 pr-3 text-sm text-foreground outline-none placeholder:text-[#9AA3AF] focus:border-[#F97316]";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C]";
const outlineButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#D5DDE6] bg-white px-5 py-2.5 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC]";

function SectionHeading({ index, icon, title, subtitle }: { index: string; icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">{index}</span>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">{icon}</span>
      <div>
        <h2 className="text-[15px] font-semibold text-[#16324F]">{title}</h2>
        <p className="text-xs text-[#7B8794]">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, required = false, className = "", children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={`block text-sm ${className}`}>
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

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {children}
    </svg>
  );
}

function LinkIcon() {
  return (
    <Icon>
      <path d="M10 14a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" strokeLinecap="round" />
      <path d="M14 10a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" strokeLinecap="round" />
    </Icon>
  );
}

function GridIcon() {
  return (
    <Icon>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </Icon>
  );
}

function ListIcon() {
  return (
    <Icon>
      <path d="M8 7h11M8 12h11M8 17h11" strokeLinecap="round" />
      <path d="M4 7h.01M4 12h.01M4 17h.01" strokeLinecap="round" />
    </Icon>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
