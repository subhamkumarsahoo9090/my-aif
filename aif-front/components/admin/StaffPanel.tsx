"use client";

import { FormEvent, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { api, apiFetch } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";
import type { AdminUser } from "@/lib/types";

type Person = AdminUser & { status: "active" | "suspended" };

export default function StaffPanel() {
  const { data, status, reload } = usePortalResource<{ staff: Person[] }>(api.admin.staff);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Person | null>(null);
  const [editing, setEditing] = useState<Person | null>(null);

  async function setAccountStatus(person: Person, next: "active" | "suspended") {
    const response = await apiFetch(api.admin.staffMember(person.id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setPending(null);
    setMessage(response.ok ? `${person.name} is ${next}.` : payload.message ?? "The account could not be updated.");
    if (response.ok) reload();
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await apiFetch(api.admin.staffMember(editing.id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fields.name, role: fields.role }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setEditing(null);
    setMessage(response.ok ? "Staff account updated." : payload.message ?? "The account could not be updated.");
    if (response.ok) reload();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await apiFetch(api.admin.staff, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? "Staff account created." : payload.message ?? "The account could not be created.");
    if (response.ok) {
      form.reset();
      reload();
    }
  }

  if (status === "error") {
    return (
      <div className="w-full">
        <LoadError onRetry={reload} />
      </div>
    );
  }

  const staff = data?.staff ?? [];

  return (
    <div className="flex flex-col gap-4">
      {message ? <p className={`${cardClass} px-5 py-3 text-sm text-[#16324F]`}>{message}</p> : null}
      {status === "loading" ? <Skeleton className="h-40" /> : null}
      {status === "ready" ? (
        <section className={cardClass}>
          <div className="flex items-center gap-3 px-5 pt-5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">1</span>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
              <UsersIcon />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#16324F]">Staff directory</h2>
              <p className="text-xs text-[#7B8794]">Internal accounts that can sign in to the admin panel.</p>
            </div>
          </div>
          {staff.length === 0 ? (
            <p className="m-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No staff accounts yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
                  <tr>
                    <th className="px-5 py-3 font-medium">User ID</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((person) => (
                    <tr key={person.id} className="border-b border-[#EEF2F6] last:border-0">
                      <td className="px-5 py-3 font-medium text-[#2E5FA5]">{person.id}</td>
                      <td className="px-5 py-3 font-medium text-[#16324F]">{person.name}</td>
                      <td className="px-5 py-3 text-[#3D4C5E]">{person.email}</td>
                      <td className="px-5 py-3 capitalize text-[#3D4C5E]">{person.role}</td>
                      <td className="px-5 py-3">
                        <StatusBadge tone={person.status === "active" ? "success" : "danger"}>{person.status}</StatusBadge>
                      </td>
                      <td className="px-5 py-3">
                        <button type="button" className="mr-3 text-sm font-medium text-[#2E5FA5]" onClick={() => setEditing(person)}>
                          Edit
                        </button>
                        <button type="button" className="text-sm font-medium text-[#F97316]" onClick={() => setPending(person)}>
                          {person.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <form onSubmit={onSubmit} className={`${cardClass} p-5`}>
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">2</span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">
            <UserPlusIcon />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#16324F]">Create staff</h2>
            <p className="text-xs text-[#7B8794]">Add an admin who can sign in with this email and password.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" required>
            <input name="name" required placeholder="Enter full name" className={fieldClass} />
          </Field>
          <Field label="Email" required>
            <input name="email" type="email" required placeholder="name@wealthdiscovery.in" className={fieldClass} />
          </Field>
          <Field label="Password" required>
            <input name="password" type="password" required minLength={6} placeholder="At least 6 characters" className={fieldClass} />
          </Field>
          <Field label="Role" required>
            <Select name="role" defaultValue="admin">
              <option value="admin">Admin</option>
              <option value="superadmin">Super admin</option>
            </Select>
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" className={orangeButtonClass}>Create staff</button>
        </div>
      </form>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-2xl border border-[#E6EDF5] bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#16324F]">Edit staff account</h2>
            <p className="mt-1 text-sm text-[#7B8794]">{editing.email}</p>
            <div className="mt-4">
              <Field label="Name" required>
                <input name="name" required defaultValue={editing.name} className={fieldClass} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Role" required>
                <Select name="role" defaultValue={editing.role}>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super admin</option>
                </Select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={outlineButtonClass} onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className={orangeButtonClass}>Save</button>
            </div>
          </form>
        </div>
      ) : null}
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[#E6EDF5] bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#16324F]">{pending.status === "active" ? "Suspend staff account" : "Activate staff account"}</h2>
            <p className="mt-2 text-sm text-[#7B8794]">{pending.name} will {pending.status === "active" ? "lose" : "regain"} sign-in access. This is written to the audit log.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={outlineButtonClass} onClick={() => setPending(null)}>Cancel</button>
              <button
                type="button"
                className={orangeButtonClass}
                onClick={() => void setAccountStatus(pending, pending.status === "active" ? "suspended" : "active")}
              >
                Confirm
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

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="9" r="2.4" />
      <path d="M4.8 17.5c.8-2 2.4-3 4.2-3s3.4 1 4.2 3" strokeLinecap="round" />
      <circle cx="16" cy="9.5" r="2" />
      <path d="M15.2 14.6c1.5.2 2.8 1 3.6 2.6" strokeLinecap="round" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="10" cy="8" r="3" />
      <path d="M4.5 19c1-2.4 3-3.6 5.5-3.6 1.2 0 2.3.3 3.2.8" strokeLinecap="round" />
      <path d="M17 11v6M14 14h6" strokeLinecap="round" />
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
