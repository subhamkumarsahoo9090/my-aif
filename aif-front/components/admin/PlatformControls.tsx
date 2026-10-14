"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { api, apiFetch } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";

type Platform = {
  kra: { endpoint: string; token: string; timeoutSeconds: number };
  securities: Array<{ identifier: string; name: string; isin: string; symbol?: string }>;
  schedules: unknown[];
};

const defaultSecuritySymbol = "WEALTH DISCOVERY INVESTMENT TRUST";

export default function PlatformControls() {
  const { data, status, reload } = usePortalResource<Platform>(api.admin.platform);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Platform["securities"][number] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [symbol, setSymbol] = useState(defaultSecuritySymbol);
  const [securityName, setSecurityName] = useState("");
  const [isin, setIsin] = useState("");

  async function post(body: Record<string, unknown>, success = "Saved.") {
    const response = await apiFetch(api.admin.platform, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? success : payload.message ?? "The change could not be saved.");
    if (response.ok) reload();
    return response.ok;
  }

  async function onSecurity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await post(
      editingId
        ? { action: "edit-security", identifier: editingId, name: securityName, isin, symbol }
        : { action: "security", name: securityName, isin, symbol },
      editingId ? "Security updated." : "Saved.",
    );
    if (!ok) return;
    setEditingId(null);
    setSymbol(defaultSecuritySymbol);
    setSecurityName("");
    setIsin("");
  }

  function editSecurity(security: Platform["securities"][number]) {
    setEditingId(security.identifier);
    setSymbol(security.symbol || defaultSecuritySymbol);
    setSecurityName(security.name);
    setIsin(security.isin || security.identifier);
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "loading" ? <Skeleton className="h-40" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {message ? <p className={`${cardClass} px-5 py-3 text-sm text-[#16324F]`}>{message}</p> : null}
      {status === "ready" && data ? (
        <>
          <section className={cardClass}>
            <div className="px-5 pt-5">
              <SectionHeading index="1" icon={<GridIcon />} title="Security master" subtitle="ISINs from holdings uploads, plus any security you add here." />
            </div>
            {data.securities.length === 0 ? (
              <p className="mx-5 mb-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No securities yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
                    <tr>
                      <th className="px-5 py-3 font-medium">ISIN Description</th>
                      <th className="px-5 py-3 font-medium">ISIN Number</th>
                      <th className="px-5 py-3 font-medium">Symbol</th>
                      <th className="px-5 py-3 font-medium"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.securities.map((security) => (
                      <tr key={security.identifier} className="border-b border-[#EEF2F6] last:border-0">
                        <td className="px-5 py-3 text-[#16324F]">{security.name}</td>
                        <td className="px-5 py-3 font-medium text-[#2E5FA5]">{security.isin || security.identifier}</td>
                        <td className="px-5 py-3 text-[#3D4C5E]">{security.symbol || "WEALTH DISCOVERY INVESTMENT TRUST"}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E7F0FF] text-[#1B3C6C] transition hover:bg-[#D5E4F8]"
                              aria-label={`Edit ${security.name}`}
                              title="Edit"
                              onClick={() => editSecurity(security)}
                            >
                              <LuPencil className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF1E8] text-[#EA6C0C] transition hover:bg-[#FFE0CC]"
                              aria-label={`Delete ${security.name}`}
                              title="Delete"
                              onClick={() => setPendingDelete(security)}
                            >
                              <LuTrash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form onSubmit={onSecurity} className="grid gap-3 p-5 md:grid-cols-4">
              <input name="symbol" value={symbol} onChange={(event) => setSymbol(event.target.value)} required className={fieldClass} />
              <input name="name" value={securityName} onChange={(event) => setSecurityName(event.target.value)} placeholder="ISIN Description" required className={fieldClass} />
              <input name="isin" value={isin} onChange={(event) => setIsin(event.target.value)} placeholder="ISIN Number" required className={fieldClass} />
              <div className="flex items-center gap-3">
                <button type="submit" className={orangeButtonClass}>{editingId ? "Save changes" : "Add security"}</button>
                {editingId ? (
                  <button
                    type="button"
                    className={outlineButtonClass}
                    onClick={() => {
                      setEditingId(null);
                      setSymbol(defaultSecuritySymbol);
                      setSecurityName("");
                      setIsin("");
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </>
      ) : null}
      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16324F]/35 p-4" onClick={() => setPendingDelete(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-security-title"
            className="w-full max-w-sm rounded-2xl border border-[#E6EDF5] bg-white p-5 shadow-[0_16px_40px_rgba(20,50,90,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E8] text-[#EA6C0C]">
                <LuTrash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="delete-security-title" className="text-base font-semibold text-[#16324F]">Remove security</h2>
                <p className="mt-1 text-sm leading-5 text-[#7B8794]">
                  {pendingDelete.name} will be removed from Security master. Holdings already saved for clients stay as they are.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={outlineButtonClass} onClick={() => setPendingDelete(null)}>Cancel</button>
              <button
                type="button"
                className={orangeButtonClass}
                onClick={() => {
                  const identifier = pendingDelete.identifier;
                  setPendingDelete(null);
                  void post({ action: "delete-security", identifier }, "Security removed.");
                }}
              >
                Remove
              </button>
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

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {children}
    </svg>
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

