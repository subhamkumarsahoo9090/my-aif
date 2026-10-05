"use client";

import { FormEvent, useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui/classes";
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

  return (
    <div className="w-full">
      {status === "loading" ? <Skeleton className="h-40" /> : null}
      {status === "ready" ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--pm-card-lilac-bg)] text-xs uppercase tracking-wide text-[var(--pm-card-lilac-color)]">
              <tr>
                <th className="px-3 py-3 font-medium">User ID</th>
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.staff.map((person) => (
                <tr key={person.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">{person.id}</td>
                  <td className="px-3 py-3">{person.name}</td>
                  <td className="px-3 py-3">{person.email}</td>
                  <td className="px-3 py-3 capitalize">{person.role}</td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={person.status === "active" ? "success" : "danger"}>{person.status}</StatusBadge>
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" className="mr-3 text-sm font-medium text-primary" onClick={() => setEditing(person)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-primary"
                      onClick={() => setPending(person)}
                    >
                      {person.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] p-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className={labelClass}>Name</span>
          <input name="name" required className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Email</span>
          <input name="email" type="email" required className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Password</span>
          <input name="password" type="password" required minLength={6} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className={labelClass}>Role</span>
          <select name="role" className={inputClass} defaultValue="admin">
            <option value="admin">Admin</option>
            <option value="superadmin">Super admin</option>
          </select>
        </label>
        {message ? <p className="text-sm text-primary sm:col-span-2">{message}</p> : null}
        <button type="submit" className={`${primaryButtonClass} sm:w-fit`}>Create staff</button>
      </form>
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Edit staff account</h2>
            <p className="mt-1 text-sm text-muted">{editing.email}</p>
            <label className="mt-4 block text-sm">
              <span className={labelClass}>Name</span>
              <input name="name" required defaultValue={editing.name} className={inputClass} />
            </label>
            <label className="mt-3 block text-sm">
              <span className={labelClass}>Role</span>
              <select name="role" defaultValue={editing.role} className={inputClass}>
                <option value="admin">Admin</option>
                <option value="superadmin">Super admin</option>
              </select>
            </label>
            <div className="mt-4 flex gap-3">
              <button type="submit" className={primaryButtonClass}>Save</button>
              <button type="button" className="text-sm text-muted" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : null}
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{pending.status === "active" ? "Suspend staff account" : "Activate staff account"}</h2>
            <p className="mt-2 text-sm text-muted">{pending.name} will {pending.status === "active" ? "lose" : "regain"} sign-in access. This is written to the audit log.</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => void setAccountStatus(pending, pending.status === "active" ? "suspended" : "active")}
              >
                Confirm
              </button>
              <button type="button" className="text-sm text-muted" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
