"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiFetch } from "@/config/endapi";

type InvestorAccount = { id: string; code: string };
type StaffAccount = { id: string; staffId: string; protected: boolean };

export default function DemoCredentials() {
  const [open, setOpen] = useState(false);
  const [investors, setInvestors] = useState<InvestorAccount[]>([]);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch(api.auth.accounts);
      const data = (await response.json().catch(() => ({}))) as {
        investors?: InvestorAccount[];
        staff?: StaffAccount[];
      };
      if (!response.ok) return;
      setInvestors(data.investors ?? []);
      setStaff(data.staff ?? []);
    } catch {
      setInvestors([]);
      setStaff([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    function onFocus() {
      void load();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [open, load]);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setOpen(false);
  }

  async function remove(kind: "investor" | "staff", id: string) {
    setPendingId(id);
    setMessage(null);
    const response = await apiFetch(api.auth.accounts, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setPendingId(null);
    if (!response.ok) {
      setMessage(data.message ?? "That user could not be deleted.");
      return;
    }
    await load();
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-end px-6 pt-6 sm:px-8 lg:px-10">
      <div className="pointer-events-auto relative">
        <button
          type="button"
          className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#1B3C6C] shadow-[0_4px_16px_rgba(8,24,56,0.18)]"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          Demo investors
        </button>
        {open ? (
          <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-3rem)] rounded-2xl border border-white/70 bg-white/95 p-3 text-sm text-[#1B3C6C] shadow-lg">
            <AccountList
              title="Investors"
              rows={investors.map((account) => ({ key: account.code, id: account.id, deleteId: account.code, kind: "investor" as const }))}
              pendingId={pendingId}
              onCopy={copy}
              onDelete={remove}
            />
            <AccountList
              title="Staff"
              rows={staff.map((account) => ({
                key: account.staffId,
                id: account.id,
                deleteId: account.staffId,
                kind: "staff" as const,
                protected: account.protected,
              }))}
              pendingId={pendingId}
              onCopy={copy}
              onDelete={remove}
            />
            {message ? <p className="mt-3 text-xs text-[#b42318]">{message}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AccountList({
  title,
  rows,
  pendingId,
  onCopy,
  onDelete,
}: {
  title: string;
  rows: Array<{ key: string; id: string; deleteId: string; kind: "investor" | "staff"; protected?: boolean }>;
  pendingId: string | null;
  onCopy: (value: string) => Promise<void>;
  onDelete: (kind: "investor" | "staff", id: string) => Promise<void>;
}) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#1B3C6C]/70">{title}</p>
      {rows.length === 0 ? <p className="mt-2 text-xs text-[#1B3C6C]/60">None</p> : null}
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">{row.id}</span>
            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                className="rounded-full bg-[#2E5FA5] px-3 py-1 text-xs font-semibold text-white"
                onClick={() => void onCopy(row.id)}
              >
                Copy
              </button>
              {row.protected ? null : (
                <button
                  type="button"
                  className="rounded-full bg-[#b42318] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                  disabled={pendingId === row.deleteId}
                  onClick={() => void onDelete(row.kind, row.deleteId)}
                >
                  Delete
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
