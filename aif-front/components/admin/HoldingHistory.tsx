"use client";

import { FormEvent, useEffect, useState } from "react";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import DateField from "@/components/ui/DateField";
import { api, apiFetch } from "@/config/endapi";
import { formatDate, formatQuantity } from "@/lib/format";

type ClientOption = { code: string; name: string };
type SecurityOption = { identifier: string; name: string; isin: string };
type HoldingRow = {
  id: string;
  clientCode: string;
  clientName: string;
  identifier: string;
  name: string;
  quantity: number;
  allotmentDate: string;
  allotteeName: string;
  pan: string;
};

type EditForm = {
  clientCode: string;
  securityId: string;
  description: string;
  isin: string;
  allottee: string;
  pan: string;
  date: string;
  units: string;
};

function isinNumber(security: SecurityOption | undefined) {
  if (!security) return "";
  return (security.isin || security.identifier).trim().toUpperCase();
}

function matchSecurity(securities: SecurityOption[], identifier: string) {
  const key = identifier.trim().toUpperCase();
  return securities.find((item) => item.identifier.toUpperCase() === key || item.isin.toUpperCase() === key);
}

export default function HoldingHistory({
  clients,
  securities,
}: {
  clients: ClientOption[];
  securities: SecurityOption[];
}) {
  const [rows, setRows] = useState<HoldingRow[]>([]);
  const [editing, setEditing] = useState<HoldingRow | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HoldingRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    const response = await apiFetch(api.admin.holdings);
    const data = (await response.json().catch(() => ({}))) as { holdings?: HoldingRow[]; message?: string };
    if (!response.ok) {
      setError(data.message ?? "Holdings could not be loaded.");
      return;
    }
    setRows(data.holdings ?? []);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(row: HoldingRow) {
    const security = matchSecurity(securities, row.identifier);
    setEditing(row);
    setError(null);
    setForm({
      clientCode: row.clientCode,
      securityId: security?.identifier ?? row.identifier,
      description: security?.name ?? row.name,
      isin: security ? isinNumber(security) : row.identifier,
      allottee: row.allotteeName,
      pan: row.pan,
      date: row.allotmentDate,
      units: String(row.quantity),
    });
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !form) return;
    const units = Number(form.units.replace(/,/g, ""));
    if (!form.isin || !form.description || !form.allottee || !form.pan || !form.date || !Number.isFinite(units) || units <= 0) {
      setError("Fill every holding field before saving.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await apiFetch(api.admin.holdings, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          clientCode: editing.clientCode,
          holdingId: editing.id,
          nextClientCode: form.clientCode,
          name: form.description,
          isin: form.isin,
          allotteeName: form.allottee,
          pan: form.pan,
          allotmentDate: form.date,
          quantity: units,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { holdings?: HoldingRow[]; message?: string };
      if (!response.ok) {
        setError(data.message ?? "This holding could not be saved.");
        return;
      }
      setRows(data.holdings ?? []);
      setEditing(null);
      setForm(null);
      setMessage("Holding updated.");
    } catch {
      setError("This holding could not be saved.");
    } finally {
      setPending(false);
    }
  }

  async function remove(row: HoldingRow) {
    setPending(true);
    setError(null);
    try {
      const response = await apiFetch(api.admin.holdings, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", clientCode: row.clientCode, holdingId: row.id }),
      });
      const data = (await response.json().catch(() => ({}))) as { holdings?: HoldingRow[]; message?: string };
      if (!response.ok) {
        setError(data.message ?? "This holding could not be removed.");
        return;
      }
      setRows(data.holdings ?? []);
      if (editing?.id === row.id && editing.clientCode === row.clientCode) {
        setEditing(null);
        setForm(null);
      }
      setMessage("Holding removed.");
    } catch {
      setError("This holding could not be removed.");
    } finally {
      setPending(false);
      setPendingDelete(null);
    }
  }

  const descriptionOptions = form
    ? securities.some((item) => item.identifier === form.securityId)
      ? securities
      : [{ identifier: form.securityId, name: form.description, isin: form.isin }, ...securities]
    : securities;

  return (
    <section className={cardClass}>
      <div className="px-5 pt-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">1</span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Holding history</h2>
            <p className="text-xs text-[#7B8794]">Allotments saved for clients. Edit or remove a row here.</p>
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
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Name of allottee<span className="text-[#F97316]"> *</span></span>
            <input value={form.allottee} onChange={(event) => setForm({ ...form, allottee: event.target.value })} required className={fieldClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">PAN<span className="text-[#F97316]"> *</span></span>
            <input
              value={form.pan}
              onChange={(event) => setForm({ ...form, pan: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) })}
              required
              maxLength={10}
              className={fieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">ISIN description<span className="text-[#F97316]"> *</span></span>
            <span className="relative block">
              <select
                value={form.securityId}
                required
                onChange={(event) => {
                  const security = descriptionOptions.find((item) => item.identifier === event.target.value);
                  setForm({
                    ...form,
                    securityId: event.target.value,
                    description: security?.name ?? "",
                    isin: isinNumber(security),
                  });
                }}
                className={`${fieldClass} appearance-none pr-10!`}
              >
                {descriptionOptions.map((security) => (
                  <option key={security.identifier} value={security.identifier}>{security.name}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B95A5]"><ChevronDown /></span>
            </span>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">ISIN number<span className="text-[#F97316]"> *</span></span>
            <input value={form.isin} readOnly required className={`${fieldClass} bg-[#F8FAFC] text-[#16324F]`} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Date of allotment<span className="text-[#F97316]"> *</span></span>
            <DateField required value={form.date} onChange={(date) => setForm({ ...form, date })} className={`${fieldClass} pr-10!`} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">Number of units<span className="text-[#F97316]"> *</span></span>
            <input
              value={form.units}
              onChange={(event) => setForm({ ...form, units: event.target.value.replace(/[^\d.]/g, "").slice(0, 12) })}
              required
              inputMode="decimal"
              className={fieldClass}
            />
          </label>
          <div className="flex items-center justify-end gap-3 md:col-span-2">
            <button
              type="button"
              className={outlineButtonClass}
              onClick={() => {
                setEditing(null);
                setForm(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className={orangeButtonClass} disabled={pending}>{pending ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      ) : null}

      {message ? <p className="mx-5 mb-4 text-sm text-[#16324F]">{message}</p> : null}
      {error ? <p className="mx-5 mb-4 text-sm text-[#B42318]">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="mx-5 mb-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No holdings yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
              <tr>
                {["Client", "ISIN", "Description", "Allotment date", "Allottee", "PAN", "Units", ""].map((column) => (
                  <th key={column || "actions"} className="whitespace-nowrap px-5 py-3 font-medium">{column}</th>
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
                  <td className="whitespace-nowrap px-5 py-3 font-medium text-[#2E5FA5]">{row.identifier}</td>
                  <td className="min-w-56 px-5 py-3 text-[#3D4C5E]">{row.name}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{row.allotmentDate ? formatDate(row.allotmentDate) : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-[#16324F]">{row.allotteeName || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-[#3D4C5E]">{row.pan || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[#16324F]">{formatQuantity(row.quantity)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E7F0FF] text-[#1B3C6C] transition hover:bg-[#D5E4F8]"
                        aria-label={`Edit ${row.name}`}
                        title="Edit"
                        onClick={() => startEdit(row)}
                      >
                        <LuPencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF1E8] text-[#EA6C0C] transition hover:bg-[#FFE0CC]"
                        aria-label={`Delete ${row.name}`}
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
            aria-labelledby="delete-holding-title"
            className="w-full max-w-sm rounded-2xl border border-[#E6EDF5] bg-white p-5 shadow-[0_16px_40px_rgba(20,50,90,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E8] text-[#EA6C0C]">
                <LuTrash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="delete-holding-title" className="text-base font-semibold text-[#16324F]">Remove holding</h2>
                <p className="mt-1 text-sm leading-5 text-[#7B8794]">
                  {pendingDelete.name} will be removed from {pendingDelete.clientName}. Security master is left as it is.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={outlineButtonClass} onClick={() => setPendingDelete(null)}>Cancel</button>
              <button type="button" className={orangeButtonClass} disabled={pending} onClick={() => void remove(pendingDelete)}>
                Remove
              </button>
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
