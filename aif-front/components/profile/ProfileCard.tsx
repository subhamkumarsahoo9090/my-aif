"use client";

import type { ReactNode } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { usePortalResource } from "@/lib/use-portal-resource";
import { api } from "@/config/endapi";
import { bankList, nomineeList } from "@/lib/client-validation";
import { formatDob } from "@/lib/format";
import type { BankAccount, InvestorProfile } from "@/lib/types";

type ProfileResponse = {
  clientCode: string;
  profile: InvestorProfile;
};

const sectionTones = {
  blue: "bg-[var(--pm-card-blue-bg)] text-[var(--pm-card-blue-color)]",
  gold: "bg-[var(--pm-card-gold-bg)] text-[var(--pm-card-gold-color)]",
  lilac: "bg-[var(--pm-card-lilac-bg)] text-[var(--pm-card-lilac-color)]",
  mint: "bg-[var(--pm-card-mint-bg)] text-[var(--pm-card-mint-color)]",
} as const;

function shown(value: string | undefined) {
  return value?.trim() || "—";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</dt>
      <dd className="mt-1 text-sm font-semibold wrap-break-word">{value}</dd>
    </div>
  );
}

function Section({
  title,
  hint,
  tone,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  tone: keyof typeof sectionTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex h-full flex-col rounded-2xl p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] ${sectionTones[tone]} ${className}`}>
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">{title}</h2>
        {hint ? <p className="mt-1 text-xs opacity-70">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function BankCard({ bank, index }: { bank: BankAccount; index: number }) {
  return (
    <article className="rounded-2xl bg-white/75 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{shown(bank.bankName)}</p>
        <StatusBadge tone={bank.isPrimary ? "success" : "neutral"}>
          {bank.isPrimary ? "Primary" : `Account ${index + 1}`}
        </StatusBadge>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Account holder" value={shown(bank.accountHolderName)} />
        <Field label="Account number" value={shown(bank.accountNumber)} />
        <Field label="IFSC code" value={shown(bank.ifsccode)} />
        <Field label="Bank city" value={shown(bank.bankCity)} />
        <Field label="Account type" value={shown(bank.accountType)} />
        <Field label="UPI ID" value={shown(bank.upiId)} />
        <Field label="MICR code" value={shown(bank.micrCode)} />
        <Field label="DP order ID" value={shown(bank.dpOrderId)} />
      </dl>
    </article>
  );
}

export default function ProfileCard() {
  const { data, status, reload } = usePortalResource<ProfileResponse>(api.portal.profile);

  return (
    <div className="w-full">
      {status === "loading" ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          <Skeleton className="h-28 lg:col-span-2" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : null}

      {status === "error" ? <LoadError onRetry={reload} /> : null}

      {status === "ready" && data ? <ProfileView profile={data.profile} /> : null}
    </div>
  );
}

function ProfileView({ profile }: { profile: InvestorProfile }) {
  const nominees = nomineeList(profile);
  const banks = bankList(profile);

  return (
    <div className="grid gap-4">
      <section className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--pm-banner-from), var(--pm-banner-to))" }}
          >
            {initials(profile.fullName)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-foreground">{profile.fullName}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {profile.tradingCode}
              <span className="px-1.5 text-muted/60">·</span>
              {shown(profile.pan)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={profile.kra ? "success" : "warning"}>
            KRA {profile.kra ? "Verified" : "Pending"}
          </StatusBadge>
          <StatusBadge tone={profile.fatca ? "success" : "warning"}>
            FATCA {profile.fatca ? "Yes" : "No"}
          </StatusBadge>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Section title="Basic details" tone="blue">
          <dl className="grid gap-2 sm:grid-cols-2">
            <Field label="Trading code" value={shown(profile.tradingCode)} />
            <Field label="Full name" value={shown(profile.fullName)} />
            <Field label="Date of birth" value={profile.dateOfBirth ? formatDob(profile.dateOfBirth) : "—"} />
            <Field label="PAN" value={shown(profile.pan)} />
          </dl>
        </Section>

        <Section title="Contact" tone="gold">
          <dl className="grid gap-2 sm:grid-cols-2">
            <Field label="Mobile number" value={shown(profile.mobile)} />
            <Field label="Email" value={shown(profile.email)} />
          </dl>
        </Section>

        <Section title="Family and income" tone="lilac">
          <dl className="grid gap-2 sm:grid-cols-2">
            <Field label="Father's name" value={shown(profile.fatherName)} />
            <Field label="Mother's name" value={shown(profile.motherName)} />
            <Field label="Marital status" value={shown(profile.maritalStatus)} />
            <Field label="Annual income" value={shown(profile.annualIncome)} />
          </dl>
        </Section>

        <Section title="Address" hint="Registered address and pincode" tone="mint">
          <p className="rounded-xl bg-white/70 px-3 py-3 text-sm font-semibold leading-6">{shown(profile.address)}</p>
        </Section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Section title="Nominees" tone="blue" className="lg:col-span-3">
          {nominees.length === 0 ? (
            <p className="rounded-xl bg-white/70 px-3 py-3 text-sm">No nominee is on file.</p>
          ) : (
            <ul className="grid gap-2">
              {nominees.map((nominee, index) => (
                <li key={`${nominee.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2.5">
                  <span className="text-sm font-semibold">{shown(nominee.name)}</span>
                  <StatusBadge tone="neutral">{shown(nominee.relationship)}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Compliance" tone="gold" className="lg:col-span-2">
          <dl className="grid gap-2">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2.5">
              <dt className="text-sm font-medium">KRA status</dt>
              <dd>
                <StatusBadge tone={profile.kra ? "success" : "warning"}>
                  {profile.kra ? "Verified" : "Pending"}
                </StatusBadge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2.5">
              <dt className="text-sm font-medium">FATCA status</dt>
              <dd>
                <StatusBadge tone={profile.fatca ? "success" : "warning"}>
                  {profile.fatca ? "Yes" : "No"}
                </StatusBadge>
              </dd>
            </div>
          </dl>
        </Section>
      </div>

      <Section title="Bank details" hint="Accounts linked to this trading code" tone="mint">
        {banks.length === 0 ? (
          <p className="rounded-xl bg-white/70 px-3 py-3 text-sm">No bank account is on file.</p>
        ) : (
          <div className="grid gap-3">
            {banks.map((bank, index) => (
              <BankCard key={`${bank.accountNumber}-${index}`} bank={bank} index={index} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
