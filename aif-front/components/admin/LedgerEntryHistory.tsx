"use client";

import { FormEvent, useEffect, useState } from "react";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import DateField from "@/components/ui/DateField";
import { api, apiFetch } from "@/config/endapi";
import { formatDate, formatInr } from "@/lib/format";

type ClientOption = { code: string; name: string };
type LedgerEntry = {
  id: string;
  clientCode: string;
  clientName: string;
  date: string;
  type: "debit" | "credit";
  amount: number;
  balance: number;
  particulars: string;
  vchType: string;
  vchNo: string;
};

type EditForm = {
  clientCode: string;
  date: string;
  type: "debit" | "credit";
  amount: string;
  particulars: string;
  vchType: string;
  vchNo: string;
};

export default function LedgerEntryHistory({ clients }: { clients: ClientOption[] }) {
  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LedgerEntry | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    const response = await apiFetch(api.admin.ledger);
    const data = (await response.json().catch(() => ({}))) as { rows?: LedgerEntry[]; message?: string };
    if (!response.ok) {
      setError(data.message ?? "Ledger rows could not be loaded.");
      return;
    }
    setRows(data.rows ?? []);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(row: LedgerEntry) {
    setEditing(row);
    setError(null);
    setForm({
      clientCode: row.clientCode,
      date: row.date,
      type: row.type,
      amount: String(row.amount),
      particulars: row.particulars,
      vchType: row.vchType,
      vchNo: row.vchNo,
    });
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !form) return;
    const amount = Number(form.amount.replace(/,/g, ""));
    if (!form.date || !form.particulars.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Date, particulars, and an amount greater than zero are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await apiFetch(api.admin.ledger, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          clientCode: editing.clientCode,
          ledgerId: editing.id,
          nextClientCode: form.clientCode,
          date: form.date,
          type: form.type,
          amount,
          particulars: form.particulars,
          vchType: form.vchType,
          vchNo: form.vchNo,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { rows?: LedgerEntry[]; message?: string };
      if (!response.ok) {
        setError(data.message ?? "This ledger row could not be saved.");
        return;
      }
      setRows(data.rows ?? []);
      setEditing(null);
      setForm(null);
      setMessage("Ledger row updated.");
    } catch {
      setError("This ledger row could not be saved.");
    } finally {
      setPending(false);
    }
  }

  async function remove(row: LedgerEntry) {
    setPending(true);
    setError(null);
    try {
      const response = await apiFetch(api.admin.ledger, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", clientCode: row.clientCode, ledgerId: row.id }),
      });
      const data = (await response.json().catch(() => ({}))) as { rows?: LedgerEntry[]; message?: string };
      if (!response.ok) {
        setError(data.message ?? "This ledger row could not be removed.");
        return;
      }
      setRows(data.rows ?? []);
      if (editing?.id === row.id && editing.clientCode === row.clientCode) {
        setEditing(null);
        setForm(null);
      }
      setMessage("Ledger row removed.");
    } catch {
      setError("This ledger row could not be removed.");
    } finally {
      setPending(false);
      setPendingDelete(null);
    }
  }

  return (
    <section className={cardClass}>
      <div className="px-5 pt-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">1</span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Ledger history</h2>
            <p className="text-xs text-[#7B8794]">Rows saved for clients. Edit or remove one here. The running balance is recalculated.</p>
          </div>
        </div>
      </div>

      {form && editing ? (
        <form onSubmit={(event) => void saveEdit(event)} className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          <label className="text-sm md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Client<span className="text-[#F97316]"> *</span></span>
            <span className="relative block">
              <select
                value={form.clientCode}
                onChange={(event) => setForm({ ...form, clientCode: event.target.value })}
                required
                className={`${fieldClass} appearance-none pr-10!`}
              >
                {clients.map((client) => (
                  <option key={client.code} value={client.code}>{client.name} · {client.code}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B95A5]"><ChevronDown /></span>
            </span>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Date<span className="text-[#F97316]"> *</span></span>
            <DateField required value={form.date} onChange={(date) => setForm({ ...form, date })} className={`${fieldClass} pr-10!`} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Type<span className="text-[#F97316]"> *</span></span>
            <span className="relative block">
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value === "credit" ? "credit" : "debit" })}
                className={`${fieldClass} appearance-none pr-10!`}
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B95A5]"><ChevronDown /></span>
            </span>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Particulars<span className="text-[#F97316]"> *</span></span>
            <input value={form.particulars} onChange={(event) => setForm({ ...form, particulars: event.target.value })} required className={fieldClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Vch Type</span>
            <input value={form.vchType} onChange={(event) => setForm({ ...form, vchType: event.target.value })} className={fieldClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Vch No.</span>
            <input value={form.vchNo} onChange={(event) => setForm({ ...form, vchNo: event.target.value })} className={fieldClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Amount<span className="text-[#F97316]"> *</span></span>
            <input
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/[^\d.]/g, "").slice(0, 14) })}
              required
              inputMode="decimal"
              className={fieldClass}
            />
          </label>
          <div className="flex items-center justify-end gap-3 md:col-span-2">
            <button type="button" className={outlineButtonClass} onClick={() => { setEditing(null); setForm(null); }}>Cancel</button>
            <button type="submit" className={orangeButtonClass} disabled={pending}>{pending ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      ) : null}

      {message ? <p className="mx-5 mb-4 text-sm text-[#16324F]">{message}</p> : null}
      {error ? <p className="mx-5 mb-4 text-sm text-[#B42318]">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="mx-5 mb-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No ledger rows yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
              <tr>
                {["Client", "Date", "Particulars", "Vch Type", "Vch No.", "Debit", "Credit", "Balance", ""].map((column) => (
                  <th key={column || "actions"} className={`whitespace-nowrap px-5 py-3 font-medium ${column === "Debit" || column === "Credit" || column === "Balance" ? "text-right" : ""}`}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.clientCode}-${row.id}`} className="border-b border-[#EEF2F6] last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 text-[#16324F]">
                    {row.clientName}
                    <span className="mt-0.5 block text-xs text-[#7B8794]">{row.clientCode}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{formatDate(row.date)}</td>
                  <td className="min-w-56 px-5 py-3 text-[#16324F]">{row.particulars}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{row.vchType || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{row.vchNo || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">{row.type === "debit" ? formatInr(row.amount) : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">{row.type === "credit" ? formatInr(row.amount) : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">{formatInr(row.balance)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E7F0FF] text-[#1B3C6C] transition hover:bg-[#D5E4F8]"
                        aria-label={`Edit ${row.particulars}`}
                        title="Edit"
                        onClick={() => startEdit(row)}
                      >
                        <LuPencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF1E8] text-[#EA6C0C] transition hover:bg-[#FFE0CC]"
                        aria-label={`Delete ${row.particulars}`}
                        title="Delete"
                        onClick={() => setPendingDelete(row)}
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

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#16324F]/35 p-4" onClick={() => setPendingDelete(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ledger-title"
            className="w-full max-w-sm rounded-2xl border border-[#E6EDF5] bg-white p-5 shadow-[0_16px_40px_rgba(20,50,90,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E8] text-[#EA6C0C]">
                <LuTrash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="delete-ledger-title" className="text-base font-semibold text-[#16324F]">Remove ledger row</h2>
                <p className="mt-1 text-sm leading-5 text-[#7B8794]">
                  {pendingDelete.particulars} will be removed from {pendingDelete.clientName}. The balance of the later rows is recalculated.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={outlineButtonClass} onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className={orangeButtonClass} disabled={pending} onClick={() => void remove(pendingDelete)}>Remove</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white py-2.5 pl-3 pr-3 text-sm text-foreground outline-none focus:border-[#F97316]";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C] disabled:cursor-not-allowed disabled:opacity-60";
const outlineButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#D5DDE6] bg-white px-5 py-2.5 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC]";

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
