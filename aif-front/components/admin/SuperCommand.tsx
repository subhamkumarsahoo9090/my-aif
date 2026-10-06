"use client";

import type { ReactNode } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatInr } from "@/lib/format";
import { api } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";

type Command = {
  aum: number;
  failedImports: number;
  sent: number;
  scheduled: number;
  sessions: Array<{ staffId: string; name: string; role: string; at: string }>;
  imports: Array<{ id: string; fileName: string; status: string; failed: number; valid: number }>;
  audit: Array<{ id: string; at: string; actor: string; action: string; detail: string }>;
};

export default function SuperCommand() {
  const { data, status, reload } = usePortalResource<Command>(api.admin.command);

  return (
    <div className="w-full">
      {status === "loading" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" && data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Platform AUM" value={formatInr(data.aum)} note="Value across investor portfolios" icon={<WalletIcon />} />
            <Metric
              label="Failed import rows"
              value={String(data.failedImports)}
              note={
                data.failedImports === 0
                  ? "No failed rows"
                  : data.failedImports === 1
                    ? "1 row needs a review"
                    : `${data.failedImports} rows need a review`
              }
              icon={<AlertIcon />}
              accent
            />
            <Metric label="Statement dispatch" value={`${data.sent} sent`} note={`${data.scheduled} scheduled`} icon={<SendIcon />} />
          </div>
          <div className="mt-6 grid items-start gap-4 lg:grid-cols-3">
            <Panel title="Staff sign-ins" count={data.sessions.length} icon={<UsersIcon />}>
              {data.sessions.length === 0 ? <Empty>No staff sessions yet.</Empty> : null}
              <ul className="space-y-2">
                {data.sessions.map((session) => (
                  <li
                    key={`${session.staffId}-${session.at}`}
                    className="flex items-center gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-xs font-semibold text-[#2E5FA5]">
                      {initials(session.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#16324F]">{session.name}</p>
                      <p className="text-xs text-muted">{roleLabel(session.role)}</p>
                    </div>
                    <time className="shrink-0 text-right text-xs text-muted" dateTime={session.at}>
                      {formatStamp(session.at)}
                    </time>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Import queue" count={data.imports.length} icon={<DownloadIcon />}>
              {data.imports.length === 0 ? <Empty>No imports in the queue.</Empty> : null}
              <ul className="space-y-2">
                {data.imports.map((job) => (
                  <li key={job.id} className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-[#16324F]">{job.fileName}</p>
                      <StatusBadge tone={job.failed > 0 ? "warning" : "success"}>
                        {job.failed > 0 ? `${job.failed} failed` : job.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {job.valid} valid · {job.failed} failed
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Critical actions" count={data.audit.length} icon={<ShieldIcon />}>
              {data.audit.length === 0 ? <Empty>No high-privilege actions yet.</Empty> : null}
              <ul className="space-y-2">
                {data.audit.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[#16324F]">{entry.action}</p>
                      <time className="shrink-0 text-xs text-muted" dateTime={entry.at}>
                        {formatStamp(entry.at)}
                      </time>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">
                      {entry.actor}
                      {entry.detail ? ` · ${entry.detail}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";

function Metric({
  label,
  value,
  note,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <article className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7B8794]">{label}</p>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-[#FFF1E6] text-[#F97316]" : "bg-[#E7F0FF] text-[#2E5FA5]"}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#16324F]">{value}</p>
      <p className="mt-1 text-sm text-[#7B8794]">{note}</p>
    </article>
  );
}

function Panel({ title, count, icon, children }: { title: string; count: number; icon: ReactNode; children: ReactNode }) {
  return (
    <section className={`${cardClass} flex max-h-128 flex-col p-5`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-[#2E5FA5]">{icon}</span>
        <h2 className="text-[15px] font-semibold text-[#16324F]">{title}</h2>
        <span className="ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#F4F7FB] px-2 text-xs font-semibold text-[#7B8794]">
          {count}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">{children}</p>;
}

function roleLabel(role: string) {
  if (role === "superadmin") return "Super admin";
  if (role === "admin") return "Admin";
  return role;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatStamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h12A2.5 2.5 0 0 1 20 8.5V17a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-8Z" />
      <path d="M3 10h17" />
      <path d="M16 14.5h2" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 4 3.5 19h17L12 4Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <path d="M12 16.5h.01" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 12 20 5l-6 15-2.5-6.5L4 12Z" strokeLinejoin="round" />
    </svg>
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

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 4v10" strokeLinecap="round" />
      <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3.5 19 6.2v5.3c0 4-2.8 6.8-7 8.5-4.2-1.7-7-4.5-7-8.5V6.2L12 3.5Z" strokeLinejoin="round" />
    </svg>
  );
}
