"use client";

import { useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { primaryButtonClass } from "@/components/ui/classes";
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
    <div className="w-full">
      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" && data ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--pm-card-blue-bg)] text-xs uppercase tracking-wide text-[var(--pm-card-blue-color)]">
              <tr>
                <th className="px-3 py-3 font-medium">Module</th>
                <th className="px-3 py-3 font-medium">Super admin</th>
                <th className="px-3 py-3 font-medium">Admin</th>
              </tr>
            </thead>
            <tbody>
              {data.modules.map((moduleName) => (
                <tr key={moduleName} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 capitalize">{moduleName === "nav" ? "NAV" : moduleName}</td>
                  <td className="px-3 py-3">Allowed</td>
                  <td className="px-3 py-3">
                    {["users", "audit", "schedules", "platform", "ledger"].includes(moduleName) ? (
                      "Super admin only"
                    ) : (
                      <input
                        type="checkbox"
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
          <div className="p-3">
            {message ? <p className="mb-2 text-sm text-primary">{message}</p> : null}
            <button type="button" className={primaryButtonClass} onClick={() => setConfirming(true)}>
              Save admin permissions
            </button>
            {confirming ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
                  <h2 className="text-lg font-semibold">Update admin permissions</h2>
                  <p className="mt-2 text-sm text-muted">This changes what every admin account can open. The change is written to the audit log.</p>
                  <div className="mt-4 flex gap-3">
                    <button type="button" className={primaryButtonClass} onClick={() => void save()}>Confirm</button>
                    <button type="button" className="text-sm text-muted" onClick={() => setConfirming(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
