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

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";

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
    <div className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-[#7B8794]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold wrap-break-word text-[#16324F]">{value}</dd>
    </div>
  );
}

function Section({
  title,
  hint,
  icon,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  icon: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${cardClass} flex h-full flex-col p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-[#2E5FA5]">{icon}</span>
        <div>
          <h2 className="text-[15px] font-semibold text-[#16324F]">{title}</h2>
          {hint ? <p className="text-xs text-[#7B8794]">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function BankCard({ bank, index }: { bank: BankAccount; index: number }) {
  return (
    <article className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#16324F]">{shown(bank.bankName)}</p>
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
  const primary = banks.find((item) => item.isPrimary) ?? banks[0];

  return (
    <div className="grid gap-4">
      <section className={`${cardClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E7F0FF] text-lg font-semibold text-[#1D4E89]">
            {initials(profile.fullName)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[#16324F]">{profile.fullName}</h2>
            <p className="mt-0.5 text-sm text-[#7B8794]">
              {profile.tradingCode}
              <span className="px-1.5 text-[#C5CED8]">·</span>
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
        <Section title="Basic details" icon={<UserGlyph />}>
          <dl className="grid gap-2 sm:grid-cols-2">
            <Field label="Trading code" value={shown(profile.tradingCode)} />
            <Field label="Trading Code" value={shown(primary?.dpOrderId)} />
            <Field label="Full name" value={shown(profile.fullName)} />
            <Field label="Date of birth" value={profile.dateOfBirth ? formatDob(profile.dateOfBirth) : "—"} />
            <Field label="PAN" value={shown(profile.pan)} />
          </dl>
        </Section>

        <Section title="Contact" icon={<MailGlyph />}>
          <dl className="grid gap-2 sm:grid-cols-2">
            <Field label="Mobile number" value={shown(profile.mobile)} />
            <Field label="Email" value={shown(profile.email)} />
          </dl>
        </Section>

        <Section title="Family and income" icon={<UsersGlyph />}>
          <dl className="grid gap-2 sm:grid-cols-2">
            <Field label="Father's name" value={shown(profile.fatherName)} />
            <Field label="Mother's name" value={shown(profile.motherName)} />
            <Field label="Occupation" value={shown(profile.occupation)} />
            <Field label="Marital status" value={shown(profile.maritalStatus)} />
            <Field label="Annual income" value={shown(profile.annualIncome)} />
          </dl>
        </Section>

        <Section title="Address" hint="Registered address and pincode" icon={<PinGlyph />}>
          <p className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-3 text-sm font-semibold leading-6 text-[#16324F]">{shown(profile.address)}</p>
        </Section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Section title="Nominees" icon={<UsersGlyph />} className="lg:col-span-3">
          {nominees.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No nominee is on file.</p>
          ) : (
            <ul className="grid gap-2">
              {nominees.map((nominee, index) => (
                <li key={`${nominee.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
                  <span className="text-sm font-semibold text-[#16324F]">{shown(nominee.name)}</span>
                  <StatusBadge tone="neutral">{shown(nominee.relationship)}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Compliance" icon={<ShieldGlyph />} className="lg:col-span-2">
          <dl className="grid gap-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
              <dt className="text-sm font-medium text-[#1B3C6C]">KRA status</dt>
              <dd>
                <StatusBadge tone={profile.kra ? "success" : "warning"}>
                  {profile.kra ? "Verified" : "Pending"}
                </StatusBadge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
              <dt className="text-sm font-medium text-[#1B3C6C]">FATCA status</dt>
              <dd>
                <StatusBadge tone={profile.fatca ? "success" : "warning"}>
                  {profile.fatca ? "Yes" : "No"}
                </StatusBadge>
              </dd>
            </div>
          </dl>
        </Section>
      </div>

      <Section title="Bank details" hint="Accounts linked to this trading code" icon={<BankGlyph />}>
        {banks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">No bank account is on file.</p>
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

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {children}
    </svg>
  );
}

function UserGlyph() {
  return (
    <Glyph>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.2c1.3-2.7 3.5-4 6.5-4s5.2 1.3 6.5 4" strokeLinecap="round" />
    </Glyph>
  );
}

function MailGlyph() {
  return (
    <Glyph>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m5 7 7 6 7-6" strokeLinejoin="round" />
    </Glyph>
  );
}

function UsersGlyph() {
  return (
    <Glyph>
      <circle cx="9" cy="9" r="2.4" />
      <path d="M4.8 17.5c.8-2 2.4-3 4.2-3s3.4 1 4.2 3" strokeLinecap="round" />
      <circle cx="16" cy="9.5" r="2" />
      <path d="M15.2 14.6c1.5.2 2.8 1 3.6 2.6" strokeLinecap="round" />
    </Glyph>
  );
}

function PinGlyph() {
  return (
    <Glyph>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2" />
    </Glyph>
  );
}

function ShieldGlyph() {
  return (
    <Glyph>
      <path d="M12 3.5 19 6.5v5.2c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.5L12 3.5Z" strokeLinejoin="round" />
    </Glyph>
  );
}

function BankGlyph() {
  return (
    <Glyph>
      <path d="M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M3 19h18M12 4l9 6H3l9-6Z" strokeLinejoin="round" />
    </Glyph>
  );
}
