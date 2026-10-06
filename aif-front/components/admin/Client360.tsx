"use client";

import { FormEvent, useState, type ReactNode } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import DateField from "@/components/ui/DateField";
import { accountTypes, annualIncomes, bankList, maritalStatuses, nomineeList, occupations, validateCreateClient } from "@/lib/client-validation";
import { formatDate, formatInr, formatQuantity } from "@/lib/format";
import { api, apiFetch } from "@/config/endapi";
import { usePortalResource } from "@/lib/use-portal-resource";
import type { BankAccount, Nominee, PortalData } from "@/lib/types";

const relationships = ["Spouse", "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Husband", "Wife", "Guardian", "Other"] as const;

const tabs = [
  "Profile",
  "Bank",
  "Nominee",
  "KRA",
  "Documents",
  "Holdings",
  "Ledger",
  "Portfolio",
  "Reports",
  "Statements",
  "Audit",
] as const;

type Tab = (typeof tabs)[number];

type RecordResponse = {
  portal: PortalData;
  incomplete: boolean;
  documents: Array<{ name: string; status: string }>;
  audit: Array<{ id: string; at: string; actor: string; action: string; detail: string }>;
};

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-[#9AA3AF] focus:border-[#F97316]";
const orangeButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C]";
const outlineButtonClass =
  "inline-flex items-center justify-center rounded-full border border-[#D5DDE6] bg-white px-4 py-2 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC]";

export default function Client360({ code }: { code: string }) {
  const { data, status, reload } = usePortalResource<RecordResponse>(api.admin.client(code));
  const [tab, setTab] = useState<Tab>("Profile");
  const [message, setMessage] = useState<string | null>(null);
  const [nominees, setNominees] = useState<Nominee[] | null>(null);

  const profile = data?.portal.profile;
  const nomineeDraft = nominees ?? (profile ? nomineeList(profile) : []);

  async function patch(body: Record<string, unknown>) {
    const response = await apiFetch(api.admin.client(code), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? "Client record updated." : payload.message ?? "The update could not be saved.");
    if (response.ok) {
      setNominees(null);
      reload();
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const parsed = validateCreateClient({
      fullName: text("fullName"),
      fatherName: text("fatherName"),
      motherName: text("motherName"),
      email: text("email"),
      mobile: text("mobile"),
      pan: text("pan"),
      dateOfBirth: text("dateOfBirth"),
      address: text("address"),
      occupation: text("occupation"),
      maritalStatus: text("maritalStatus"),
      annualIncome: text("annualIncome"),
      tradingCode: profile.tradingCode,
      nominees: nomineeList(profile),
      bank: { ...primaryBank(profile), dpOrderId: text("dpOrderId") },
      status: text("status") === "inactive" ? "inactive" : "active",
      kra: profile.kra,
    });
    if (!parsed.ok) {
      setMessage(parsed.message);
      return;
    }
    await patch({
      fullName: parsed.value.fullName,
      fatherName: parsed.value.fatherName,
      motherName: parsed.value.motherName,
      email: parsed.value.email,
      mobile: parsed.value.mobile,
      pan: parsed.value.pan,
      dateOfBirth: parsed.value.dateOfBirth,
      address: parsed.value.address,
      occupation: parsed.value.occupation,
      maritalStatus: parsed.value.maritalStatus,
      annualIncome: parsed.value.annualIncome,
      status: parsed.value.status,
      bank: parsed.value.bank,
    });
  }

  async function saveBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const bank: BankAccount = {
      accountHolderName: text("accountHolderName"),
      accountNumber: text("accountNumber"),
      ifsccode: text("ifsccode").toUpperCase(),
      bankName: text("bankName"),
      bankCity: text("bankCity"),
      accountType: text("accountType"),
      upiId: text("upiId"),
      micrCode: text("micrCode"),
      dpOrderId: primaryBank(profile).dpOrderId,
      isPrimary: true,
    };
    const parsed = validateCreateClient({
      fullName: profile.fullName,
      fatherName: profile.fatherName,
      motherName: profile.motherName,
      email: profile.email,
      mobile: profile.mobile,
      pan: profile.pan,
      dateOfBirth: profile.dateOfBirth,
      address: profile.address,
      tradingCode: profile.tradingCode,
      nominees: nomineeList(profile),
      bank,
      status: profile.status,
      kra: profile.kra,
    });
    if (!parsed.ok) {
      setMessage(parsed.message);
      return;
    }
    await patch({ bank: parsed.value.bank });
  }

  async function saveNominees(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const parsed = validateCreateClient({
      fullName: profile.fullName,
      fatherName: profile.fatherName,
      motherName: profile.motherName,
      email: profile.email,
      mobile: profile.mobile,
      pan: profile.pan,
      dateOfBirth: profile.dateOfBirth,
      address: profile.address,
      tradingCode: profile.tradingCode,
      nominees: nomineeDraft,
      bank: primaryBank(profile),
      status: profile.status,
      kra: profile.kra,
    });
    if (!parsed.ok) {
      setMessage(parsed.message);
      return;
    }
    await patch({ nominees: parsed.value.nominees });
  }

  async function saveCompliance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await patch({
      kra: form.get("kra") === "on",
      fatca: form.get("fatca") === "on",
    });
  }

  function updateNominee(index: number, patchFields: Partial<Nominee>) {
    setNominees(nomineeDraft.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchFields } : item)));
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {status === "loading" ? <Skeleton className="h-80" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" && data && profile ? (
        <>
          <section className={`${cardClass} flex flex-wrap items-center gap-4 p-5`}>
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E7F0FF] text-lg font-semibold text-[#1D4E89]">
              {initials(profile.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-[#16324F]">{profile.fullName}</h2>
              <p className="text-sm text-[#7B8794]">Trading code {profile.tradingCode}</p>
              <p className="mt-1 truncate text-sm text-[#3D4C5E]">
                {profile.email} · {profile.mobile} · {profile.pan}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={profile.status === "active" ? "success" : "neutral"}>{profile.status}</StatusBadge>
              <StatusBadge tone={profile.kra ? "success" : "warning"}>{profile.kra ? "KRA verified" : "KRA pending"}</StatusBadge>
              {data.incomplete ? <StatusBadge tone="danger">Incomplete profile</StatusBadge> : null}
            </div>
          </section>

          <div className={`${cardClass} overflow-x-auto p-2`}>
            <div className="flex min-w-max gap-1">
              {tabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={
                    tab === item
                      ? "rounded-full bg-[#F97316] px-3.5 py-2 text-sm font-medium text-white shadow-[0_6px_14px_rgba(249,115,22,0.28)]"
                      : "rounded-full px-3.5 py-2 text-sm font-medium text-[#5C6B7A] hover:bg-[#F4F7FB]"
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {message ? (
            <p
              className={`rounded-2xl border px-4 py-3 text-sm ${
                message === "Client record updated."
                  ? "border-[#D7F0E3] bg-[#F3FBF6] text-[#157A45]"
                  : "border-[#F6D5D5] bg-[#FFF6F6] text-danger"
              }`}
            >
              {message}
            </p>
          ) : null}

          {tab === "Profile" ? (
            <form key={`${profile.tradingCode}-${profile.fatherName}-${profile.motherName}-${profile.status}`} onSubmit={saveProfile} className={`${cardClass} p-5`}>
              <SectionHeading icon={<UserIcon />} title="Personal details" subtitle="Name, contact, PAN, and account status" />
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field name="fullName" label="Full name" defaultValue={profile.fullName} />
                <Field name="dpOrderId" label="Trading Code" defaultValue={primaryBank(profile).dpOrderId} />
                <Field name="fatherName" label="Father's name" defaultValue={profile.fatherName} />
                <Field name="motherName" label="Mother's name" defaultValue={profile.motherName} />
                <Field name="email" label="Email" defaultValue={profile.email} />
                <Field name="mobile" label="Mobile" defaultValue={profile.mobile} />
                <Field name="pan" label="PAN" defaultValue={profile.pan} />
                <label className="text-sm">
                  <FieldLabel>Date of birth</FieldLabel>
                  <DateField name="dateOfBirth" defaultValue={profile.dateOfBirth} className={`${fieldClass} pr-10!`} />
                </label>
                <Select name="maritalStatus" label="Marital status" defaultValue={profile.maritalStatus || ""}>
                  <option value="">Select marital status</option>
                  {profile.maritalStatus && !maritalStatuses.includes(profile.maritalStatus as (typeof maritalStatuses)[number]) ? (
                    <option value={profile.maritalStatus}>{profile.maritalStatus}</option>
                  ) : null}
                  {maritalStatuses.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <Select name="annualIncome" label="Annual income" defaultValue={profile.annualIncome || ""}>
                  <option value="">Select annual income</option>
                  {profile.annualIncome && !annualIncomes.includes(profile.annualIncome as (typeof annualIncomes)[number]) ? (
                    <option value={profile.annualIncome}>{profile.annualIncome}</option>
                  ) : null}
                  {annualIncomes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <Select name="occupation" label="Occupation" defaultValue={profile.occupation || ""}>
                  <option value="">Select occupation</option>
                  {profile.occupation && !occupations.includes(profile.occupation as (typeof occupations)[number]) ? (
                    <option value={profile.occupation}>{profile.occupation}</option>
                  ) : null}
                  {occupations.filter((item) => item !== "Other").map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <Select name="status" label="Status" defaultValue={profile.status}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
                <div className="md:col-span-2 xl:col-span-3">
                  <Field name="address" label="Address" defaultValue={profile.address} />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button type="submit" className={orangeButtonClass}>Save profile</button>
              </div>
            </form>
          ) : null}

          {tab === "Bank" ? (
            <BankForm key={`${profile.tradingCode}-bank`} bank={primaryBank(profile)} onSubmit={saveBank} />
          ) : null}

          {tab === "Nominee" ? (
            <form onSubmit={saveNominees} className={`${cardClass} p-5`}>
              <SectionHeading icon={<UsersIcon />} title="Nominees" subtitle="People named on this account" />
              <div className="mt-5 flex flex-col gap-4">
                {nomineeDraft.map((nominee, index) => (
                  <div key={index} className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] p-4">
                    <p className="mb-3 text-sm font-semibold text-[#16324F]">Nominee {index + 1}</p>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <label className="text-sm">
                        <FieldLabel>Name</FieldLabel>
                        <input
                          value={nominee.name}
                          onChange={(event) => updateNominee(index, { name: event.target.value })}
                          placeholder="Enter nominee name"
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-sm">
                        <FieldLabel>Relationship</FieldLabel>
                        <span className="relative block">
                          <select
                            value={relationships.includes(nominee.relationship as (typeof relationships)[number]) ? nominee.relationship : ""}
                            onChange={(event) => updateNominee(index, { relationship: event.target.value })}
                            className={`${fieldClass} appearance-none pr-10! ${nominee.relationship ? "" : "text-[#9AA3AF]"}`}
                          >
                            <option value="">Select relationship</option>
                            {relationships.filter((relationship) => relationship !== "Other").map((relationship) => (
                              <option key={relationship} value={relationship}>
                                {relationship}
                              </option>
                            ))}
                          </select>
                          <Chevron />
                        </span>
                      </label>
                      <label className="text-sm">
                        <FieldLabel>Or type a relationship</FieldLabel>
                        <input
                          value={nominee.relationship}
                          onChange={(event) => updateNominee(index, { relationship: event.target.value })}
                          placeholder="Type a relationship"
                          className={fieldClass}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={outlineButtonClass}
                    onClick={() => setNominees([...nomineeDraft, { name: "", relationship: "" }])}
                  >
                    Add nominee
                  </button>
                  {nomineeDraft.length > 1 ? (
                    <button type="button" className={outlineButtonClass} onClick={() => setNominees(nomineeDraft.slice(0, -1))}>
                      Remove last
                    </button>
                  ) : null}
                </div>
                <button type="submit" className={orangeButtonClass}>Save nominees</button>
              </div>
            </form>
          ) : null}

          {tab === "KRA" ? (
            <form key={`${profile.tradingCode}-kra`} onSubmit={saveCompliance} className={`${cardClass} p-5`}>
              <SectionHeading icon={<ShieldIcon />} title="Compliance" subtitle="KRA verification and FATCA status" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-4 py-3 text-sm font-medium text-[#1B3C6C]">
                  <input name="kra" type="checkbox" defaultChecked={profile.kra} />
                  KRA verified
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-4 py-3 text-sm font-medium text-[#1B3C6C]">
                  <input name="fatca" type="checkbox" defaultChecked={profile.fatca} />
                  FATCA complete
                </label>
              </div>
              <div className="mt-5 flex justify-end">
                <button type="submit" className={orangeButtonClass}>Save compliance</button>
              </div>
            </form>
          ) : null}

          {tab === "Documents" ? (
            <DataCard icon={<DocIcon />} title="Documents" subtitle="Proofs and issued files on this record">
              {data.documents.length === 0 ? (
                <Empty>Nothing recorded yet.</Empty>
              ) : (
                <Table
                  columns={["Document", "Status"]}
                  rows={data.documents.map((item) => [
                    item.name,
                    <StatusBadge key={item.status} tone={item.status === "Missing" || item.status === "Pending" ? "warning" : "success"}>
                      {item.status}
                    </StatusBadge>,
                  ])}
                />
              )}
            </DataCard>
          ) : null}

          {tab === "Holdings" ? (
            <DataCard icon={<GridIcon />} title="Holdings" subtitle="Allotments matched to this client">
              {data.portal.holdings.length === 0 ? (
                <Empty>Nothing recorded yet.</Empty>
              ) : data.portal.holdings.some((row) => row.allotmentDate || row.pan) ? (
                <Table
                  columns={["Sr. No.", "ISIN", "Description", "Allotment date", "Allottee", "PAN", "Units"]}
                  rows={data.portal.holdings.map((row) => [
                    row.srNo || "—",
                    row.identifier,
                    row.name,
                    row.allotmentDate ? formatDate(row.allotmentDate) : "—",
                    row.allotteeName || "—",
                    row.pan || "—",
                    formatQuantity(row.quantity),
                  ])}
                />
              ) : (
                <Table
                  columns={["Identifier", "Name", "Quantity", "Avg cost", "Market value", "P&L"]}
                  rows={data.portal.holdings.map((row) => [
                    row.identifier,
                    row.name,
                    formatQuantity(row.quantity),
                    formatInr(row.averageCost),
                    formatInr(row.marketValue),
                    <span key={row.id} className={row.pnl < 0 ? "font-medium text-danger" : "font-medium text-[#157A45]"}>
                      {formatInr(row.pnl)}
                    </span>,
                  ])}
                />
              )}
            </DataCard>
          ) : null}

          {tab === "Ledger" ? (
            <DataCard icon={<ListIcon />} title="Ledger" subtitle="Capital movements and running balance">
              {data.portal.ledger.length === 0 ? (
                <Empty>Nothing recorded yet.</Empty>
              ) : (
                <Table
                  columns={["Date", "Type", "Amount", "Balance", "Narration"]}
                  rows={data.portal.ledger.map((row) => [
                    formatDate(row.date),
                    <StatusBadge key={row.id} tone={row.type === "credit" ? "success" : "neutral"}>
                      {row.type}
                    </StatusBadge>,
                    formatInr(row.amount),
                    formatInr(row.balance),
                    row.narration,
                  ])}
                />
              )}
            </DataCard>
          ) : null}

          {tab === "Portfolio" ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Metric label="Total value" value={formatInr(data.portal.metrics.totalPortfolioValue)} note="Portfolio value including realized P&L" />
              <Metric label="Invested capital" value={formatInr(data.portal.metrics.investedCapital)} note="Capital contributions on the ledger" />
              <Metric label="Current valuation" value={formatInr(data.portal.metrics.currentValuation)} note="Market value of current holdings" />
              <Metric label="Realized P&L" value={formatInr(data.portal.metrics.realizedPnl)} note="P&L already booked" signed={data.portal.metrics.realizedPnl} />
              <Metric label="Unrealized P&L" value={formatInr(data.portal.metrics.unrealizedPnl)} note="P&L still open on holdings" signed={data.portal.metrics.unrealizedPnl} />
            </section>
          ) : null}

          {tab === "Reports" || tab === "Statements" ? (
            <DataCard
              icon={<DocIcon />}
              title={tab === "Reports" ? "Reports" : "Statements"}
              subtitle={tab === "Reports" ? "Generated report files for this client" : "Issued statements for this client"}
            >
              {data.portal.statements.length === 0 ? (
                <Empty>Nothing recorded yet.</Empty>
              ) : (
                <Table
                  columns={["Period", "File", "Issued on"]}
                  rows={data.portal.statements.map((row) => [row.period, row.fileName, formatDate(row.issuedOn)])}
                />
              )}
            </DataCard>
          ) : null}

          {tab === "Audit" ? (
            <DataCard icon={<ClockIcon />} title="Audit trail" subtitle="Changes recorded against this client">
              {data.audit.length === 0 ? (
                <Empty>Nothing recorded yet.</Empty>
              ) : (
                <Table
                  columns={["When", "User", "Action", "Detail"]}
                  rows={data.audit.map((row) => [formatDate(row.at.slice(0, 10)), row.actor, row.action, row.detail])}
                />
              )}
            </DataCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">{children}</span>;
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="text-sm">
      <FieldLabel>{label}</FieldLabel>
      <input name={name} defaultValue={defaultValue} className={fieldClass} />
    </label>
  );
}

function Select({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className="text-sm">
      <FieldLabel>{label}</FieldLabel>
      <span className="relative block">
        <select name={name} defaultValue={defaultValue} className={`${fieldClass} appearance-none pr-10!`}>
          {children}
        </select>
        <Chevron />
      </span>
    </label>
  );
}

function BankForm({ bank, onSubmit }: { bank: BankAccount; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className={`${cardClass} p-5`}>
      <SectionHeading icon={<BankIcon />} title="Bank details" subtitle="Primary account used for this client" />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field name="accountHolderName" label="Account holder name" defaultValue={bank.accountHolderName} />
        <Field name="accountNumber" label="Account number" defaultValue={bank.accountNumber} />
        <Field name="ifsccode" label="IFSC code" defaultValue={bank.ifsccode} />
        <Field name="bankName" label="Bank name" defaultValue={bank.bankName} />
        <Field name="bankCity" label="Bank city" defaultValue={bank.bankCity} />
        <Select name="accountType" label="Account type" defaultValue={bank.accountType}>
          <option value="">Select account type</option>
          {accountTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Field name="upiId" label="UPI ID" defaultValue={bank.upiId} />
        <Field name="micrCode" label="MICR code" defaultValue={bank.micrCode} />
      </div>
      <div className="mt-5 flex justify-end">
        <button type="submit" className={orangeButtonClass}>Save bank</button>
      </div>
    </form>
  );
}

function SectionHeading({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">{icon}</span>
      <div>
        <h2 className="text-[15px] font-semibold text-[#16324F]">{title}</h2>
        <p className="text-xs text-[#7B8794]">{subtitle}</p>
      </div>
    </div>
  );
}

function DataCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className={cardClass}>
      <div className="px-5 pt-5">
        <SectionHeading icon={icon} title={title} subtitle={subtitle} />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-y border-[#E6EDF5] text-xs uppercase tracking-wide text-[#7B8794]">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-5 py-3 font-medium">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-[#EEF2F6] last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-5 py-3 text-[#16324F]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value, note, signed }: { label: string; value: string; note: string; signed?: number }) {
  const tone = signed == null ? "text-[#16324F]" : signed < 0 ? "text-danger" : "text-[#157A45]";
  return (
    <article className={`${cardClass} p-5`}>
      <p className="text-sm font-medium text-[#7B8794]">{label}</p>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-[#7B8794]">{note}</p>
    </article>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="m-5 rounded-xl border border-dashed border-[#E3E8EF] px-3 py-6 text-center text-sm text-[#7B8794]">{children}</p>;
}

function Chevron() {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B95A5]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
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

function UsersIcon() {
  return (
    <Icon>
      <circle cx="9" cy="9" r="2.4" />
      <path d="M4.8 17.5c.8-2 2.4-3 4.2-3s3.4 1 4.2 3" strokeLinecap="round" />
      <circle cx="16" cy="9.5" r="2" />
      <path d="M15.2 14.6c1.5.2 2.8 1 3.6 2.6" strokeLinecap="round" />
    </Icon>
  );
}

function BankIcon() {
  return (
    <Icon>
      <path d="M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M3 19h18M12 4l9 6H3l9-6Z" strokeLinejoin="round" />
    </Icon>
  );
}

function ShieldIcon() {
  return (
    <Icon>
      <path d="M12 3.5 19 6.5v5.2c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.5L12 3.5Z" strokeLinejoin="round" />
    </Icon>
  );
}

function DocIcon() {
  return (
    <Icon>
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5M8 12h8M8 16h6" strokeLinecap="round" />
    </Icon>
  );
}

function GridIcon() {
  return (
    <Icon>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
    </Icon>
  );
}

function ListIcon() {
  return (
    <Icon>
      <path d="M8 7h12M8 12h12M8 17h12" strokeLinecap="round" />
      <circle cx="4.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

function ClockIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" strokeLinecap="round" />
    </Icon>
  );
}

function primaryBank(profile: PortalData["profile"]): BankAccount {
  const bank = bankList(profile).find((item) => item.isPrimary) ?? bankList(profile)[0];
  return (
    bank ?? {
      accountNumber: "",
      ifsccode: "",
      accountHolderName: "",
      upiId: "",
      bankCity: "",
      bankName: "",
      micrCode: "",
      accountType: "",
      isPrimary: true,
      dpOrderId: "",
    }
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
