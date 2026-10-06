"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatInr } from "@/lib/format";
import { api } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";
import type { ClientStatus } from "@/lib/types";

type ClientRow = {
  code: string;
  name: string;
  mobile: string;
  email: string;
  status: ClientStatus;
  kra: boolean;
  incomplete: boolean;
  aum: number;
};

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white py-2.5 text-sm text-foreground outline-none placeholder:text-[#9AA3AF] focus:border-[#F97316]";

export default function ClientMaster() {
  const router = useRouter();
  const { data, status, reload } = usePortalResource<{ clients: ClientRow[] }>(api.admin.clients);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ClientStatus>("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.clients ?? []).filter((client) => {
      const matchesStatus = filter === "all" || client.status === filter;
      const matchesQuery =
        !needle ||
        client.name.toLowerCase().includes(needle) ||
        client.code.toLowerCase().includes(needle) ||
        client.email.toLowerCase().includes(needle) ||
        client.mobile.includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [data, query, filter]);

  return (
    <div className="flex flex-col gap-4">
      <section className={`${cardClass} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block w-full max-w-sm">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-[#8B95A5]">
              <SearchIcon />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search code, name, mobile, or email"
              className={`${fieldClass} pl-10!`}
            />
          </label>
          <label className="relative block w-full max-w-45">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as "all" | ClientStatus)}
              className={`${fieldClass} appearance-none pr-10! pl-3`}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B95A5]">
              <ChevronDown />
            </span>
          </label>
          <Link
            href="/admin/clients/new"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C]"
          >
            <PlusIcon />
            Create Client
          </Link>
        </div>
      </section>

      {status === "loading" ? <Skeleton className="h-64" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" ? (
        <section className={`${cardClass} overflow-x-auto`}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
              <tr>
                <th className="px-4 py-3 font-medium"><HeaderLabel icon={<HashIcon />}>Code</HeaderLabel></th>
                <th className="px-4 py-3 font-medium"><HeaderLabel icon={<UserIcon />}>Name</HeaderLabel></th>
                <th className="px-4 py-3 font-medium"><HeaderLabel icon={<PhoneIcon />}>Mobile</HeaderLabel></th>
                <th className="px-4 py-3 font-medium"><HeaderLabel icon={<MailIcon />}>Email</HeaderLabel></th>
                <th className="px-4 py-3 font-medium"><HeaderLabel icon={<ShieldIcon />}>Status</HeaderLabel></th>
                <th className="px-4 py-3 text-right font-medium"><HeaderLabel icon={<TrendIcon />} align="end">AUM</HeaderLabel></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((client) => (
                <tr
                  key={client.code}
                  className="cursor-pointer border-b border-[#EEF2F6] last:border-0 hover:bg-[#F8FAFC]"
                  onClick={() => router.push(`/admin/clients/${client.code}`)}
                >
                  <td className="px-4 py-3 font-medium text-[#2E5FA5]">{client.code}</td>
                  <td className="px-4 py-3 font-medium text-[#16324F]">{client.name}</td>
                  <td className="px-4 py-3 text-[#3D4C5E]">{client.mobile}</td>
                  <td className="px-4 py-3 text-[#3D4C5E]">{client.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={client.status === "active" ? "success" : "neutral"}>{client.status}</StatusBadge>
                    {!client.kra ? <span className="ml-2"><StatusBadge tone="warning">KRA pending</StatusBadge></span> : null}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#16324F]">{formatInr(client.aum)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#7B8794]">No clients match this search.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

function HeaderLabel({ icon, children, align = "start" }: { icon: ReactNode; children: string; align?: "start" | "end" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${align === "end" ? "justify-end" : ""}`}>
      <span className="text-[#8B95A5]">{icon}</span>
      {children}
    </span>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" strokeLinecap="round" />
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 6v12M6 12h12" strokeLinecap="round" />
    </svg>
  );
}

function HashIcon() {
  return (
    <Icon>
      <path d="M9 4 7 20M17 4l-2 16M5 9h15M4 15h15" strokeLinecap="round" />
    </Icon>
  );
}

function UserIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.2c1.3-2.7 3.5-4 6.5-4s5.2 1.3 6.5 4" strokeLinecap="round" />
    </Icon>
  );
}

function PhoneIcon() {
  return (
    <Icon>
      <path d="M8 4h3l1.2 3-1.8 1.2a12 12 0 0 0 5.4 5.4L17 12l3 1.2v3A1.8 1.8 0 0 1 18.2 19 14 14 0 0 1 5 5.8 1.8 1.8 0 0 1 6.8 4H8Z" strokeLinejoin="round" />
    </Icon>
  );
}

function MailIcon() {
  return (
    <Icon>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m5 7 7 6 7-6" strokeLinejoin="round" />
    </Icon>
  );
}

function ShieldIcon() {
  return (
    <Icon>
      <path d="M12 3.5 19 6.2v5.3c0 4-2.8 6.8-7 8.5-4.2-1.7-7-4.5-7-8.5V6.2L12 3.5Z" strokeLinejoin="round" />
    </Icon>
  );
}

function TrendIcon() {
  return (
    <Icon>
      <path d="M4 16l5-5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}
