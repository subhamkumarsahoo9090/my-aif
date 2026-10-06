"use client";

import { useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { api, apiFetch } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";

type Matrix = {
  modules: string[];
  roles: {
    superadmin: Record<string, boolean>;
    admin: Record<string, boolean>;
  };
};

export default function RoleMatrix() {
  const { data, status, reload } = usePortalResource<Matrix>(api.admin.roles);
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const admin = draft ?? data?.roles.admin ?? {};

  async function save() {
    const response = await apiFetch(api.admin.roles, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin }),
    });
    setMessage(response.ok ? "Admin permissions saved." : "The role matrix could not be saved.");
    if (response.ok) {
      setDraft(null);
      reload();
    }
    setConfirming(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {message ? <p className={`${cardClass} px-5 py-3 text-sm text-[#16324F]`}>{message}</p> : null}
      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" && data ? (
        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">1</span>
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
                <ShieldIcon />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-[#16324F]">Role matrix</h2>
                <p className="text-xs text-[#7B8794]">Super admin keeps full access. Choose what the admin role can open.</p>
              </div>
            </div>
            <button type="button" className={orangeButtonClass} onClick={() => setConfirming(true)}>
              Save admin permissions
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
                <tr>
                  <th className="px-5 py-3 font-medium">Module</th>
                  <th className="px-5 py-3 font-medium">Super admin</th>
                  <th className="px-5 py-3 font-medium">Admin</th>
                </tr>
              </thead>
              <tbody>
                {data.modules.map((moduleName) => (
                  <tr key={moduleName} className="border-b border-[#EEF2F6] last:border-0">
                    <td className="px-5 py-3 font-medium capitalize text-[#16324F]">{moduleName === "nav" ? "NAV" : moduleName}</td>
                    <td className="px-5 py-3 text-[#3D4C5E]">Allowed</td>
                    <td className="px-5 py-3">
                      {["users", "audit", "schedules", "platform", "ledger"].includes(moduleName) ? (
                        <span className="text-[#7B8794]">Super admin only</span>
                      ) : (
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#F97316]"
                          checked={Boolean(admin[moduleName])}
                          onChange={(event) =>
                            setDraft({ ...(draft ?? data.roles.admin), [moduleName]: event.target.checked })
                          }
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {confirming ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[#E6EDF5] bg-white p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-[#16324F]">Update admin permissions</h2>
                <p className="mt-2 text-sm text-[#7B8794]">This changes what every admin account can open. The change is written to the audit log.</p>
                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" className={outlineButtonClass} onClick={() => setConfirming(false)}>Cancel</button>
                  <button type="button" className={orangeButtonClass} onClick={() => void save()}>Confirm</button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C]";
const outlineButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#D5DDE6] bg-white px-5 py-2.5 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC]";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3.5 19 6.2v5.3c0 4-2.8 6.8-7 8.5-4.2-1.7-7-4.5-7-8.5V6.2L12 3.5Z" strokeLinejoin="round" />
    </svg>
  );
}
