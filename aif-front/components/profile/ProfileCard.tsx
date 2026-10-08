"use client";

import type { ReactNode } from "react";
import {
  LuBadgeCheck,
  LuBriefcase,
  LuCalendar,
  LuCopy,
  LuGlobe,
  LuIdCard,
  LuLandmark,
  LuMail,
  LuMapPin,
  LuPhone,
  LuShieldCheck,
  LuUser,
  LuUsers,
} from "react-icons/lu";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import { useApp } from "@/context/AppProvider";
import { usePortalResource } from "@/lib/use-portal-resource";
import { api } from "@/config/endapi";
import { bankList, nomineeList } from "@/lib/client-validation";
import { formatDob } from "@/lib/format";
import type { BankAccount, InvestorProfile } from "@/lib/types";

type ProfileResponse = {
  clientCode: string;
  profile: InvestorProfile;
};

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

function ageYears(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const today = new Date();
  let years = today.getFullYear() - year;
  const currentMonth = today.getMonth() + 1;
  if (currentMonth < month || (currentMonth === month && today.getDate() < day)) years -= 1;
  if (years < 0 || years > 120) return null;
  return years;
}

function dobLabel(iso: string) {
  if (!iso) return "—";
  const formatted = formatDob(iso);
  const years = ageYears(iso);
  return years === null ? formatted : `${formatted} (${years} yrs)`;
}

function CopyButton({ value }: { value: string }) {
  const { pushToast } = useApp();
  const text = value.trim();
  if (!text || text === "—") return null;

  return (
    <button
      type="button"
      aria-label={`Copy ${text}`}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#8B97A8] hover:bg-white/80 hover:text-[#1B3C6C]"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(
          () => pushToast("Copied.", "success"),
          () => pushToast("Could not copy that value."),
        );
      }}
    >
      <LuCopy className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

function Panel({
  title,
  icon,
  chip,
  children,
}: {
  title: string;
  icon: ReactNode;
  chip: string;
  children: ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-[#E6EDF5] bg-white p-4 shadow-[0_8px_24px_rgba(20,50,90,0.04)] sm:p-5">
      <div className="mb-1 flex items-center gap-2.5">
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${chip}`}>{icon}</span>
        <h2 className="text-sm font-semibold text-[#16324F]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
  copy = false,
  icon,
}: {
  label: string;
  value: string;
  copy?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#E6EDF5]/80 py-2.5 last:border-b-0">
      <dt className="flex shrink-0 items-center gap-2 pt-0.5 text-sm text-[#7B8794]">
        {icon ? <span className="text-[#8B97A8]">{icon}</span> : null}
        {label}
      </dt>
      <dd className="flex min-w-0 items-start justify-end gap-1 text-right text-sm font-semibold text-[#16324F]">
        <span className="wrap-break-word">{value}</span>
        {copy ? <CopyButton value={value} /> : null}
      </dd>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5">
      <p className="text-xs text-[#7B8794]">{label}</p>
      <p className="mt-1 text-sm font-semibold wrap-break-word text-[#16324F]">{value}</p>
    </div>
  );
}

function StatusPill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        ok
          ? "border-[#B3CCEF] bg-[var(--pm-nav-dashboard-bg)] text-[var(--pm-nav-dashboard-color)]"
          : "border-[#E7C99A] bg-[var(--pm-nav-ledger-bg)] text-[var(--pm-nav-ledger-color)]"
      }`}
    >
      {ok ? <LuBadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function ComplianceLine({
  label,
  ok,
  yes,
  no,
  icon,
}: {
  label: string;
  ok: boolean;
  yes: string;
  no: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#E6EDF5]/80 py-2.5 last:border-b-0">
      <dt className="flex items-center gap-2 text-sm text-[#5C6B7A]">
        <span className="text-[#7B8794]">{icon}</span>
        {label}
      </dt>
      <dd>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            ok ? "bg-[var(--pm-nav-dashboard-bg)] text-[var(--pm-nav-dashboard-color)]" : "bg-[var(--pm-nav-ledger-bg)] text-[var(--pm-nav-ledger-color)]"
          }`}
        >
          {ok ? yes : no}
        </span>
      </dd>
    </div>
  );
}

export default function ProfileCard() {
  const { data, status, reload } = usePortalResource<ProfileResponse>(api.portal.profile);

  return (
    <div className="w-full">
      {status === "loading" ? (
        <div className="grid gap-4" aria-busy="true">
          <Skeleton className="h-28" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-56" />
            ))}
          </div>
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
  const active = profile.status === "active";

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-[#E6EDF5] bg-white p-4 shadow-[0_8px_24px_rgba(20,50,90,0.05)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1B3C6C] text-lg font-semibold text-white">
              {initials(profile.fullName)}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-xl font-bold tracking-tight text-[#16324F]">{profile.fullName}</h2>
                {active ? (
                  <LuBadgeCheck className="h-5 w-5 shrink-0 text-[var(--pm-nav-dashboard-color)]" aria-hidden="true" />
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-[#7B8794]">
                <span>{profile.tradingCode}</span>
                <span aria-hidden="true" className="text-[#C5CED8]">·</span>
                <span>{shown(profile.pan)}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    active ? "bg-[var(--pm-nav-dashboard-bg)] text-[var(--pm-nav-dashboard-color)]" : "bg-[var(--pm-nav-profile-bg)] text-[var(--pm-nav-profile-color)]"
                  }`}
                >
                  {active ? "Active client" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <StatusPill ok={profile.kra}>KRA {profile.kra ? "Verified" : "Pending"}</StatusPill>
            <StatusPill ok={profile.fatca}>FATCA {profile.fatca ? "Yes" : "No"}</StatusPill>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Trading code"
          value={shown(profile.tradingCode)}
          copy
          chip="bg-[var(--pm-nav-dashboard-bg)] text-[var(--pm-nav-dashboard-color)]"
          icon={<LuUser className="h-4 w-4" aria-hidden="true" />}
        />
        <StatTile
          label="PAN number"
          value={shown(profile.pan)}
          copy
          chip="bg-[var(--pm-nav-holdings-bg)] text-[var(--pm-nav-holdings-color)]"
          icon={<LuIdCard className="h-4 w-4" aria-hidden="true" />}
        />
        <StatTile
          label="Date of birth"
          value={profile.dateOfBirth ? dobLabel(profile.dateOfBirth) : "—"}
          chip="bg-[var(--pm-nav-profile-bg)] text-[var(--pm-nav-profile-color)]"
          icon={<LuCalendar className="h-4 w-4" aria-hidden="true" />}
        />
        <StatTile
          label="Occupation"
          value={shown(profile.occupation)}
          chip="bg-[var(--pm-nav-ledger-bg)] text-[var(--pm-nav-ledger-color)]"
          icon={<LuBriefcase className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Personal information" chip="bg-[var(--pm-nav-dashboard-bg)] text-[var(--pm-nav-dashboard-color)]" icon={<LuUser className="h-4 w-4" aria-hidden="true" />}>
          <dl>
            <InfoRow label="Full name" value={shown(profile.fullName)} />
            <InfoRow label="Trading code" value={shown(profile.tradingCode)} copy />
            <InfoRow label="Trading Code" value={shown(primary?.dpOrderId)} />
            <InfoRow label="PAN number" value={shown(profile.pan)} copy />
            <InfoRow label="Date of birth" value={profile.dateOfBirth ? formatDob(profile.dateOfBirth) : "—"} />
          </dl>
        </Panel>

        <Panel title="Contact information" chip="bg-[var(--pm-nav-ledger-bg)] text-[var(--pm-nav-ledger-color)]" icon={<LuPhone className="h-4 w-4" aria-hidden="true" />}>
          <dl>
            <InfoRow label="Mobile number" value={shown(profile.mobile)} copy icon={<LuPhone className="h-4 w-4" aria-hidden="true" />} />
            <InfoRow label="Email address" value={shown(profile.email)} copy icon={<LuMail className="h-4 w-4" aria-hidden="true" />} />
            <InfoRow label="Address" value={shown(profile.address)} icon={<LuMapPin className="h-4 w-4" aria-hidden="true" />} />
          </dl>
        </Panel>

        <Panel title="Compliance status" chip="bg-[var(--pm-nav-profile-bg)] text-[var(--pm-nav-profile-color)]" icon={<LuShieldCheck className="h-4 w-4" aria-hidden="true" />}>
          <dl>
            <ComplianceLine label="KRA status" ok={profile.kra} yes="Verified" no="Pending" icon={<LuShieldCheck className="h-4 w-4" aria-hidden="true" />} />
            <ComplianceLine label="FATCA" ok={profile.fatca} yes="Yes" no="No" icon={<LuGlobe className="h-4 w-4" aria-hidden="true" />} />
          </dl>
        </Panel>

        <Panel title="Family and income" chip="bg-[var(--pm-nav-holdings-bg)] text-[var(--pm-nav-holdings-color)]" icon={<LuUsers className="h-4 w-4" aria-hidden="true" />}>
          <div className="grid grid-cols-2 gap-2">
            <MiniField label="Father's name" value={shown(profile.fatherName)} />
            <MiniField label="Mother's name" value={shown(profile.motherName)} />
            <MiniField label="Marital status" value={shown(profile.maritalStatus)} />
            <MiniField label="Annual income" value={shown(profile.annualIncome)} />
          </div>
        </Panel>

        <Panel title="Nominees" chip="bg-[var(--pm-nav-dashboard-bg)] text-[var(--pm-nav-dashboard-color)]" icon={<LuShieldCheck className="h-4 w-4" aria-hidden="true" />}>
          {nominees.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#E3E8EF] px-3 py-8 text-center text-sm text-[#7B8794]">
              No nominee is on file.
            </p>
          ) : (
            <ul className="grid gap-2">
              {nominees.map((nominee, index) => (
                <li key={`${nominee.name}-${index}`} className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B3C6C] text-xs font-semibold text-white">
                    {initials(nominee.name || "?")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#16324F]">{shown(nominee.name)}</p>
                    <p className="truncate text-xs text-[#7B8794]">{shown(nominee.relationship)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Bank details" chip="bg-[var(--pm-nav-statements-bg)] text-[var(--pm-nav-statements-color)]" icon={<LuLandmark className="h-4 w-4" aria-hidden="true" />}>
          {banks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#E3E8EF] px-3 py-8 text-center text-sm text-[#7B8794]">
              No bank account is on file.
            </p>
          ) : (
            <ul className="grid gap-3">
              {banks.map((bank, index) => (
                <BankBlock key={`${bank.accountNumber}-${index}`} bank={bank} index={index} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  copy = false,
  chip,
  icon,
}: {
  label: string;
  value: string;
  copy?: boolean;
  chip: string;
  icon: ReactNode;
}) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-[#E6EDF5] bg-white px-4 py-3.5 shadow-[0_8px_24px_rgba(20,50,90,0.04)]">
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${chip}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#7B8794]">{label}</p>
        <p className="truncate text-sm font-bold text-[#16324F]">{value}</p>
      </div>
      {copy ? <CopyButton value={value} /> : null}
    </article>
  );
}

function BankBlock({ bank, index }: { bank: BankAccount; index: number }) {
  return (
    <li className="rounded-xl bg-[#F8FAFC] px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-[#16324F]">{shown(bank.bankName)}</p>
        <span className="shrink-0 rounded-full bg-[#F4F7FB] px-2 py-0.5 text-[11px] font-semibold text-[#1B3C6C]">
          {bank.isPrimary ? "Primary" : `Account ${index + 1}`}
        </span>
      </div>
      <dl>
        <InfoRow label="Account holder" value={shown(bank.accountHolderName)} />
        <InfoRow label="Account number" value={shown(bank.accountNumber)} copy />
        <InfoRow label="IFSC code" value={shown(bank.ifsccode)} />
        <InfoRow label="Account type" value={shown(bank.accountType)} />
        <InfoRow label="Bank city" value={shown(bank.bankCity)} />
        <InfoRow label="UPI ID" value={shown(bank.upiId)} />
        <InfoRow label="MICR code" value={shown(bank.micrCode)} />
      </dl>
    </li>
  );
}

