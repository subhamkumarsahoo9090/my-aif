"use client";

import type { ReactNode } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatInr } from "@/lib/format";
import { api } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";

type Overview = {
  active: number;
  inactive: number;
  pendingKra: number;
  incomplete: number;
  aum: number;
  imports: Array<{ id: string; type: string; fileName: string; status: string; valid: number; failed: number; at: string }>;
  runs: Array<{ id: string; clientName: string; statementType: string; period: string; status: string; at: string }>;
};

export default function AdminDashboard() {
  const { data, status, reload } = usePortalResource<Overview>(api.admin.overview);

  return (
    <div className="w-full">
      {status === "loading" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" && data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Active clients" value={String(data.active)} note={`${data.inactive} inactive`} icon={<UserIcon />} />
            <Metric label="Pending KRA" value={String(data.pendingKra)} note="Unverified KYC records" icon={<ShieldIcon />} accent />
            <Metric label="Incomplete profiles" value={String(data.incomplete)} note="Missing mandatory fields" icon={<AlertIcon />} />
            <Metric label="Portfolio summary" value={formatInr(data.aum)} note="Aggregate AUM" icon={<TrendIcon />} />
            <Metric label="Recent imports" value={String(data.imports.length)} note="Latest upload jobs" icon={<DownloadIcon />} />
            <Metric label="Statement runs" value={String(data.runs.length)} note="Dispatch history" icon={<DocIcon />} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className={`${cardClass} p-5`}>
              <PanelTitle icon={<DownloadIcon />}>Recent imports</PanelTitle>
              {data.imports.length === 0 ? <Empty>No imports yet.</Empty> : null}
              <ul className="space-y-2 text-sm">
                {data.imports.map((job) => (
                  <li key={job.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
                    <div>
                      <p className="font-medium text-[#16324F]">{job.fileName}</p>
                      <p className="text-[#7B8794]">{job.type} · {formatDate(job.at.slice(0, 10))} · {job.valid} valid, {job.failed} failed</p>
                    </div>
                    <StatusBadge tone={job.status === "committed" ? "success" : "danger"}>{job.status}</StatusBadge>
                  </li>
                ))}
              </ul>
            </section>
            <section className={`${cardClass} p-5`}>
              <PanelTitle icon={<DocIcon />}>Statement runs</PanelTitle>
              {data.runs.length === 0 ? <Empty>No statement runs yet.</Empty> : null}
              <ul className="space-y-2 text-sm">
                {data.runs.map((run) => (
                  <li key={run.id} className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
                    <p className="font-medium text-[#16324F]">{run.clientName}</p>
                    <p className="text-[#7B8794]">{run.statementType} · {run.period} · {run.status}</p>
                  </li>
                ))}
              </ul>
            </section>
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

function PanelTitle({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E7F0FF] text-[#2E5FA5]">{icon}</span>
      <h2 className="text-[15px] font-semibold text-[#16324F]">{children}</h2>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">{children}</p>;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {children}
    </svg>
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

function ShieldIcon() {
  return (
    <Icon>
      <path d="M12 3.5 19 6.2v5.3c0 4-2.8 6.8-7 8.5-4.2-1.7-7-4.5-7-8.5V6.2L12 3.5Z" strokeLinejoin="round" />
    </Icon>
  );
}

function AlertIcon() {
  return (
    <Icon>
      <path d="M12 4 3.5 19h17L12 4Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <path d="M12 16.5h.01" strokeLinecap="round" />
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

function DownloadIcon() {
  return (
    <Icon>
      <path d="M12 4v10" strokeLinecap="round" />
      <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" strokeLinecap="round" />
    </Icon>
  );
}

function DocIcon() {
  return (
    <Icon>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" strokeLinecap="round" />
    </Icon>
  );
}
