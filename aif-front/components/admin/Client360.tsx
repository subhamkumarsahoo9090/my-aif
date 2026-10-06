"use client";

import { FormEvent, useState } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/classes";
import DateField from "@/components/ui/DateField";
import { accountTypes, bankList, nomineeList, validateCreateClient } from "@/lib/client-validation";
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

type RecordResponse = {
  portal: PortalData;
  incomplete: boolean;
  documents: Array<{ name: string; status: string }>;
  audit: Array<{ id: string; at: string; actor: string; action: string; detail: string }>;
};

export default function Client360({ code }: { code: string }) {
  const { data, status, reload } = usePortalResource<RecordResponse>(api.admin.client(code));
  const [tab, setTab] = useState<(typeof tabs)[number]>("Profile");
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
      fatherName: profile.fatherName,
      motherName: profile.motherName,
      email: text("email"),
      mobile: text("mobile"),
      pan: text("pan"),
      dateOfBirth: text("dateOfBirth"),
      address: text("address"),
      tradingCode: profile.tradingCode,
      nominees: nomineeList(profile),
      bank: primaryBank(profile),
      status: text("status") === "inactive" ? "inactive" : "active",
      kra: profile.kra,
    });
    if (!parsed.ok) {
      setMessage(parsed.message);
      return;
    }
    await patch({
      fullName: parsed.value.fullName,
      email: parsed.value.email,
      mobile: parsed.value.mobile,
      pan: parsed.value.pan,
      dateOfBirth: parsed.value.dateOfBirth,
      address: parsed.value.address,
      status: parsed.value.status,
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
      dpOrderId: text("dpOrderId"),
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
    <div className="w-full">
      {profile ? <h2 className="mb-4 text-lg font-semibold">{profile.fullName} · {profile.tradingCode}</h2> : null}
      {status === "loading" ? <Skeleton className="h-80" /> : null}
      {status === "error" ? <LoadError onRetry={reload} /> : null}
      {status === "ready" && data && profile ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusBadge tone={profile.status === "active" ? "success" : "neutral"}>{profile.status}</StatusBadge>
            <StatusBadge tone={profile.kra ? "success" : "warning"}>{profile.kra ? "KRA verified" : "KRA pending"}</StatusBadge>
            {data.incomplete ? <StatusBadge tone="danger">Incomplete profile</StatusBadge> : null}
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={
                  tab === item
                    ? "rounded-full bg-primary px-3 py-1.5 text-sm text-white"
                    : "rounded-full bg-white px-3 py-1.5 text-sm text-muted shadow-[0_4px_12px_rgba(20,50,90,0.05)]"
                }
              >
                {item}
              </button>
            ))}
          </div>
          {message ? <p className="mb-3 text-sm text-primary">{message}</p> : null}
          {tab === "Profile" ? (
            <form key={profile.tradingCode} onSubmit={saveProfile} className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] lg:grid-cols-3">
              <Field name="fullName" label="Full name" defaultValue={profile.fullName} />
              <Field name="email" label="Email" defaultValue={profile.email} />
              <Field name="mobile" label="Mobile" defaultValue={profile.mobile} />
              <Field name="pan" label="PAN" defaultValue={profile.pan} />
              <Field name="dateOfBirth" label="Date of birth" type="date" defaultValue={profile.dateOfBirth} />
              <Field name="address" label="Address" defaultValue={profile.address} />
              <label className="text-sm">
                <span className={labelClass}>Status</span>
                <select name="status" defaultValue={profile.status} className={inputClass}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className="lg:col-span-3">
                <button type="submit" className={primaryButtonClass}>Save profile</button>
              </div>
            </form>
          ) : null}
          {tab === "Bank" ? (
            <BankForm key={`${profile.tradingCode}-bank`} bank={primaryBank(profile)} onSubmit={saveBank} />
          ) : null}
          {tab === "Nominee" ? (
            <form onSubmit={saveNominees} className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
              {nomineeDraft.map((nominee, index) => (
                <div key={index} className="grid gap-4 border-t border-border pt-4 first:border-0 first:pt-0 lg:grid-cols-3">
                  <label className="text-sm">
                    <span className={labelClass}>Nominee {index + 1}</span>
                    <input
                      value={nominee.name}
                      onChange={(event) => updateNominee(index, { name: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm">
                    <span className={labelClass}>Relationship</span>
                    <select
                      value={relationships.includes(nominee.relationship as (typeof relationships)[number]) ? nominee.relationship : ""}
                      onChange={(event) => updateNominee(index, { relationship: event.target.value })}
                      className={inputClass}
                    >
                      <option value="">Select relationship</option>
                      {relationships.filter((relationship) => relationship !== "Other").map((relationship) => (
                        <option key={relationship} value={relationship}>
                          {relationship}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className={labelClass}>Or type a relationship</span>
                    <input
                      value={nominee.relationship}
                      onChange={(event) => updateNominee(index, { relationship: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
              ))}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setNominees([...nomineeDraft, { name: "", relationship: "" }])}
                >
                  Add nominee
                </button>
                {nomineeDraft.length > 1 ? (
                  <button type="button" className={secondaryButtonClass} onClick={() => setNominees(nomineeDraft.slice(0, -1))}>
                    Remove last nominee
                  </button>
                ) : null}
                <button type="submit" className={primaryButtonClass}>Save nominees</button>
              </div>
            </form>
          ) : null}
          {tab === "KRA" ? (
            <form key={`${profile.tradingCode}-kra`} onSubmit={saveCompliance} className="rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
              <label className="flex items-center gap-2 text-sm">
                <input name="kra" type="checkbox" defaultChecked={profile.kra} />
                KRA verified
              </label>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input name="fatca" type="checkbox" defaultChecked={profile.fatca} />
                FATCA complete
              </label>
              <button type="submit" className={`${primaryButtonClass} mt-4`}>Save compliance</button>
            </form>
          ) : null}
          {tab === "Documents" ? <SimpleList rows={data.documents.map((item) => `${item.name} — ${item.status}`)} /> : null}
          {tab === "Holdings" ? (
            <SimpleList rows={data.portal.holdings.map((row) => `${row.identifier} · ${row.name} · ${formatQuantity(row.quantity)} · ${formatInr(row.marketValue)}`)} />
          ) : null}
          {tab === "Ledger" ? (
            <SimpleList rows={data.portal.ledger.map((row) => `${formatDate(row.date)} · ${row.type} · ${formatInr(row.amount)} · ${row.narration}`)} />
          ) : null}
          {tab === "Portfolio" ? (
            <SimpleList
              rows={[
                `Total value ${formatInr(data.portal.metrics.totalPortfolioValue)}`,
                `Invested capital ${formatInr(data.portal.metrics.investedCapital)}`,
                `Current valuation ${formatInr(data.portal.metrics.currentValuation)}`,
                `Realized P&L ${formatInr(data.portal.metrics.realizedPnl)}`,
                `Unrealized P&L ${formatInr(data.portal.metrics.unrealizedPnl)}`,
              ]}
            />
          ) : null}
          {tab === "Reports" || tab === "Statements" ? (
            <SimpleList rows={data.portal.statements.map((row) => `${row.period} · ${row.fileName} · ${formatDate(row.issuedOn)}`)} />
          ) : null}
          {tab === "Audit" ? (
            <SimpleList rows={data.audit.map((row) => `${formatDate(row.at.slice(0, 10))} · ${row.actor} · ${row.action} · ${row.detail}`)} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <label className="text-sm">
      <span className={labelClass}>{label}</span>
      {type === "date" ? (
        <DateField name={name} defaultValue={defaultValue} className={inputClass} />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue} className={inputClass} />
      )}
    </label>
  );
}

function BankForm({ bank, onSubmit }: { bank: BankAccount; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-[0_10px_24px_rgba(20,50,90,0.05)] lg:grid-cols-3">
      <Field name="accountHolderName" label="Account holder name" defaultValue={bank.accountHolderName} />
      <Field name="accountNumber" label="Account number" defaultValue={bank.accountNumber} />
      <Field name="ifsccode" label="IFSC code" defaultValue={bank.ifsccode} />
      <Field name="bankName" label="Bank name" defaultValue={bank.bankName} />
      <Field name="bankCity" label="Bank city" defaultValue={bank.bankCity} />
      <label className="text-sm">
        <span className={labelClass}>Account type</span>
        <select name="accountType" defaultValue={bank.accountType} className={inputClass}>
          <option value="">Select account type</option>
          {accountTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <Field name="upiId" label="UPI ID" defaultValue={bank.upiId} />
      <Field name="micrCode" label="MICR code" defaultValue={bank.micrCode} />
      <Field name="dpOrderId" label="DP order ID" defaultValue={bank.dpOrderId} />
      <div className="lg:col-span-3">
        <button type="submit" className={primaryButtonClass}>Save bank</button>
      </div>
    </form>
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

function SimpleList({ rows }: { rows: string[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Nothing recorded yet.</p>;
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-white shadow-[0_10px_24px_rgba(20,50,90,0.05)] text-sm">
      {rows.map((row) => (
        <li key={row} className="px-4 py-3">{row}</li>
      ))}
    </ul>
  );
}
