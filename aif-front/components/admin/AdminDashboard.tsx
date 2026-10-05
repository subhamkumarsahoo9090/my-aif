"use client";

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
            <Metric tone="blue" label="Active clients" value={String(data.active)} note={`${data.inactive} inactive`} />
            <Metric tone="gold" label="Pending KRA" value={String(data.pendingKra)} note="Unverified KYC records" />
            <Metric tone="lilac" label="Incomplete profiles" value={String(data.incomplete)} note="Missing mandatory fields" />
            <Metric tone="mint" label="Portfolio summary" value={formatInr(data.aum)} note="Aggregate AUM" />
            <Metric tone="blue" label="Recent imports" value={String(data.imports.length)} note="Latest upload jobs" />
            <Metric tone="gold" label="Statement runs" value={String(data.runs.length)} note="Dispatch history" />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] p-4">
              <h2 className="text-sm font-medium text-primary">Recent imports</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {data.imports.map((job) => (
                  <li key={job.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{job.fileName}</p>
                      <p className="text-muted">{job.type} · {formatDate(job.at.slice(0, 10))} · {job.valid} valid, {job.failed} failed</p>
                    </div>
                    <StatusBadge tone={job.status === "committed" ? "success" : "danger"}>{job.status}</StatusBadge>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] p-4">
              <h2 className="text-sm font-medium text-primary">Statement runs</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {data.runs.map((run) => (
                  <li key={run.id}>
                    <p className="font-medium">{run.clientName}</p>
                    <p className="text-muted">{run.statementType} · {run.period} · {run.status}</p>
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

const metricTones = {
  blue: "bg-[var(--pm-card-blue-bg)] text-[var(--pm-card-blue-color)]",
  gold: "bg-[var(--pm-card-gold-bg)] text-[var(--pm-card-gold-color)]",
  lilac: "bg-[var(--pm-card-lilac-bg)] text-[var(--pm-card-lilac-color)]",
  mint: "bg-[var(--pm-card-mint-bg)] text-[var(--pm-card-mint-color)]",
} as const;

function Metric({
  tone,
  label,
  value,
  note,
}: {
  tone: keyof typeof metricTones;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className={`rounded-2xl p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] ${metricTones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm opacity-80">{note}</p>
    </article>
  );
}
