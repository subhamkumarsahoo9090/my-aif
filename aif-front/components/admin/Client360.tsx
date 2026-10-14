"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import LoadError from "@/components/ui/LoadError";
import Skeleton from "@/components/ui/Skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import DateField from "@/components/ui/DateField";
import { accountTypes, annualIncomes, bankList, maritalStatuses, nomineeList, occupations, validateCreateClient } from "@/lib/client-validation";
import { formatDate, formatInr, formatNav, formatPnl, formatQuantity } from "@/lib/format";
import { formatShareCents, nomineeShareTotalCents } from "@/lib/nominee-share";
import { passwordError } from "@/lib/password";
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
  currentNav: number | null;
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
  const [showHoldingCost, setShowHoldingCost] = useState(false);

  const profile = data?.portal.profile;
  const holdingsByDate = [...(data?.portal.holdings ?? [])].sort((left, right) => {
    const earlier = left.allotmentDate ?? "";
    const later = right.allotmentDate ?? "";
    if (earlier === later) return 0;
    if (!earlier) return 1;
    if (!later) return -1;
    return earlier.localeCompare(later);
  });
  const purchasePortfolio = purchasePortfolioByHolding(holdingsByDate);
  const totalUnits = holdingsByDate.reduce((sum, row) => sum + row.quantity, 0);
  const currentPortfolio = data?.currentNav != null ? Math.round(totalUnits * data.currentNav * 100) / 100 : null;
  const currentPnl = holdingsByDate.reduce((sum, row) => sum + row.pnl, 0);
  const nomineeDraft = nominees ?? (profile ? nomineeList(profile) : []);

  useEffect(() => {
    if (!profile || (profile.kra && profile.fatca)) return;
    const cleanPan = profile.pan.trim().toUpperCase();
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanPan) || !/^\d{4}-\d{2}-\d{2}$/.test(profile.dateOfBirth)) return;
    let active = true;
    void (async () => {
      try {
        const response = await apiFetch(api.admin.kraStatus, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pan: cleanPan, dob: profile.dateOfBirth }),
        });
        const payload = (await response.json().catch(() => ({}))) as { kra?: boolean; fatca?: boolean };
        if (!active || !response.ok) return;
        const next: { kra?: boolean; fatca?: boolean } = {};
        if (!profile.kra && payload.kra === true) next.kra = true;
        if (!profile.fatca && payload.fatca === true) next.fatca = true;
        if (next.kra == null && next.fatca == null) return;
        await patch(next, "Compliance updated.");
      } catch {
        // Leave compliance unticked when the check cannot be completed.
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);
  const nomineeShareCentsTotal = nomineeShareTotalCents(nomineeDraft);

  async function patch(body: Record<string, unknown>, success = "Client record updated.") {
    const response = await apiFetch(api.admin.client(code), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? success : payload.message ?? "The update could not be saved.");
    if (response.ok) {
      setNominees(null);
      reload();
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const localError = passwordError(password);
    if (localError) {
      setMessage(localError);
      return;
    }
    if (password !== confirm) {
      setMessage("The passwords do not match.");
      return;
    }
    const response = await apiFetch(api.admin.clientPassword(code), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? "Password updated." : payload.message ?? "The password could not be updated.");
    if (response.ok) event.currentTarget.reset();
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
      dpClientId: text("dpClientId"),
      dpName: text("dpName"),
      ckycNo: text("ckycNo"),
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
      dpClientId: parsed.value.dpClientId,
      dpName: parsed.value.dpName,
      ckycNo: parsed.value.ckycNo,
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
      bankAddress: text("bankAddress"),
      upiId: primaryBank(profile).upiId,
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
    }, { requireNomineeShareTotal: true });
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
              <p className="text-sm text-[#7B8794]">AIF code {profile.tradingCode}</p>
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
                message === "Client record updated." || message === "Password updated." || message === "NAV updated."
                  ? "border-[#D7F0E3] bg-[#F3FBF6] text-[#157A45]"
                  : "border-[#F6D5D5] bg-[#FFF6F6] text-danger"
              }`}
            >
              {message}
            </p>
          ) : null}

          {tab === "Profile" ? (
            <form key={`${profile.tradingCode}-${profile.fatherName}-${profile.motherName}-${profile.status}-${profile.ckycNo ?? ""}`} onSubmit={saveProfile} className={`${cardClass} p-5`}>
              <SectionHeading icon={<UserIcon />} title="Personal details" subtitle="Name, contact, PAN, and account status" />
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field name="tradingCode" label="AIF Code" defaultValue={profile.tradingCode} readOnly />
                <Field name="dpClientId" label="DP Client ID" defaultValue={profile.dpClientId ?? ""} />
                <Field name="fullName" label="Full Name" defaultValue={profile.fullName} />
                <Field name="pan" label="PAN" defaultValue={profile.pan} />
                <Field name="email" label="Email" defaultValue={profile.email} />
                <Field name="mobile" label="Mobile" defaultValue={profile.mobile} />
                <Select name="maritalStatus" label="Marital Status" defaultValue={profile.maritalStatus || ""}>
                  <option value="">Select marital status</option>
                  {profile.maritalStatus && !maritalStatuses.includes(profile.maritalStatus as (typeof maritalStatuses)[number]) ? (
                    <option value={profile.maritalStatus}>{profile.maritalStatus}</option>
                  ) : null}
                  {maritalStatuses.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <label className="text-sm">
                  <FieldLabel>Date of Birth</FieldLabel>
                  <DateField name="dateOfBirth" defaultValue={profile.dateOfBirth} className={`${fieldClass} pr-10!`} />
                </label>
                <Select name="occupation" label="Occupation" defaultValue={profile.occupation || ""}>
                  <option value="">Select occupation</option>
                  {profile.occupation && !occupations.includes(profile.occupation as (typeof occupations)[number]) ? (
                    <option value={profile.occupation}>{profile.occupation}</option>
                  ) : null}
                  {occupations.filter((item) => item !== "Other").map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <Select name="annualIncome" label="Annual Income" defaultValue={profile.annualIncome || ""}>
                  <option value="">Select annual income</option>
                  {profile.annualIncome && !annualIncomes.includes(profile.annualIncome as (typeof annualIncomes)[number]) ? (
                    <option value={profile.annualIncome}>{profile.annualIncome}</option>
                  ) : null}
                  {annualIncomes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
                <Select name="status" label="Status" defaultValue={profile.status}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
                <Field name="fatherName" label="Father's Name" defaultValue={profile.fatherName} />
                <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 xl:col-span-3">
                  <Field name="motherName" label="Mother's Name" defaultValue={profile.motherName} />
                  <Field name="dpName" label="DP Name" defaultValue={profile.dpName ?? ""} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 xl:col-span-3">
                  <Field name="address" label="Address" defaultValue={profile.address} />
                  <Field name="ckycNo" label="CKYC No." defaultValue={profile.ckycNo ?? ""} inputMode="numeric" maxLength={14} digitsOnly />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button type="submit" className={orangeButtonClass}>Save profile</button>
              </div>
            </form>
          ) : null}

          {tab === "Profile" ? (
            <form onSubmit={resetPassword} className={`${cardClass} p-5`}>
              <SectionHeading icon={<KeyIcon />} title="Reset password" subtitle="Set a new sign-in password for this investor." />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <FieldLabel>New password</FieldLabel>
                  <input name="password" type="password" autoComplete="new-password" required className={fieldClass} />
                </label>
                <label className="text-sm">
                  <FieldLabel>Confirm password</FieldLabel>
                  <input name="confirm" type="password" autoComplete="new-password" required className={fieldClass} />
                </label>
              </div>
              <p className="mt-3 text-xs text-[#7B8794]">At least 8 characters, with a letter and a number. The investor’s current sign-in stops working.</p>
              <div className="mt-5 flex justify-end">
                <button type="submit" className={orangeButtonClass}>Reset password</button>
              </div>
            </form>
          ) : null}

          {tab === "Bank" ? (
            <BankForm key={`${profile.tradingCode}-bank`} bank={primaryBank(profile)} onSubmit={saveBank} />
          ) : null}

          {tab === "Nominee" ? (
            <form onSubmit={saveNominees} className={`${cardClass} p-5`}>
              <SectionHeading icon={<UsersIcon />} title="Nominees" subtitle="Nominee shares must add up to 100%." />
              <div className="mt-5 flex flex-col gap-4">
                {nomineeDraft.map((nominee, index) => (
                  <div key={index} className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] p-4">
                    <p className="mb-3 text-sm font-semibold text-[#16324F]">Nominee {index + 1}</p>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <label className="text-sm">
                        <FieldLabel>Nominee Name</FieldLabel>
                        <input
                          value={nominee.name}
                          onChange={(event) => updateNominee(index, { name: event.target.value })}
                          placeholder="Enter nominee name"
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-sm">
                        <FieldLabel>Relationship with Nominee</FieldLabel>
                        <span className="relative block">
                          <select
                            value={relationshipChoice(nominee.relationship)}
                            onChange={(event) => updateNominee(index, { relationship: event.target.value })}
                            className={`${fieldClass} appearance-none pr-10! ${nominee.relationship ? "" : "text-[#9AA3AF]"}`}
                          >
                            <option value="">Select relationship</option>
                            {relationships.map((relationship) => (
                              <option key={relationship} value={relationship}>
                                {relationship}
                              </option>
                            ))}
                          </select>
                          <Chevron />
                        </span>
                      </label>
                      {relationshipChoice(nominee.relationship) === "Other" ? (
                        <label className="text-sm">
                          <FieldLabel>Relationship</FieldLabel>
                          <input
                            value={nominee.relationship === "Other" ? "" : nominee.relationship}
                            onChange={(event) => updateNominee(index, { relationship: event.target.value || "Other" })}
                            placeholder="Enter relationship"
                            className={fieldClass}
                          />
                        </label>
                      ) : null}
                      <label className="text-sm">
                        <FieldLabel>Date of Birth</FieldLabel>
                        <DateField
                          value={nominee.dateOfBirth ?? ""}
                          onChange={(value) => updateNominee(index, { dateOfBirth: value })}
                          className={`${fieldClass} pr-10!`}
                        />
                      </label>
                      <label className="text-sm">
                        <FieldLabel>Mobile Number</FieldLabel>
                        <input
                          value={nominee.mobile ?? ""}
                          onChange={(event) => updateNominee(index, { mobile: event.target.value.replace(/\D/g, "").slice(0, 10) })}
                          inputMode="numeric"
                          placeholder="10-digit mobile number"
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-sm">
                        <FieldLabel>Email</FieldLabel>
                        <input
                          type="email"
                          value={nominee.email ?? ""}
                          onChange={(event) => updateNominee(index, { email: event.target.value })}
                          placeholder="example@domain.com"
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-sm">
                        <FieldLabel>PAN</FieldLabel>
                        <input
                          value={nominee.pan ?? ""}
                          onChange={(event) => updateNominee(index, { pan: event.target.value.toUpperCase().slice(0, 10) })}
                          placeholder="ABCDE1234F"
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-sm lg:col-span-2">
                        <FieldLabel>Address</FieldLabel>
                        <input
                          value={nominee.address ?? ""}
                          onChange={(event) => updateNominee(index, { address: event.target.value })}
                          placeholder="Enter address"
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-sm">
                        <FieldLabel>Nominee Share (%)</FieldLabel>
                        <input
                          value={nominee.share ?? ""}
                          onChange={(event) => updateNominee(index, { share: event.target.value.replace(/[^\d.]/g, "").slice(0, 6) })}
                          inputMode="decimal"
                          placeholder="0 to 100"
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
                    onClick={() =>
                      setNominees([
                        ...nomineeDraft,
                        { name: "", relationship: "", dateOfBirth: "", mobile: "", email: "", pan: "", address: "", share: "" },
                      ])
                    }
                  >
                    Add nominee
                  </button>
                  {nomineeDraft.length > 1 ? (
                    <button type="button" className={outlineButtonClass} onClick={() => setNominees(nomineeDraft.slice(0, -1))}>
                      Remove last
                    </button>
                  ) : null}
                </div>
                <p className={`text-sm font-semibold ${nomineeShareCentsTotal === 10000 ? "text-[#16324F]" : "text-danger"}`}>
                  Total nominee share: {formatShareCents(nomineeShareCentsTotal)}%
                </p>
                <button type="submit" className={orangeButtonClass}>Save nominees</button>
              </div>
            </form>
          ) : null}

          {tab === "KRA" ? (
            <form key={`${profile.tradingCode}-${profile.kra}-${profile.fatca}-kra`} onSubmit={saveCompliance} className={`${cardClass} p-5`}>
              <SectionHeading icon={<ShieldIcon />} title="Compliance" subtitle="KRA ticks for status 07. FATCA ticks when the FATCA flag has a value." />
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
            <DataCard
              icon={<GridIcon />}
              title="Holdings"
              subtitle="Allotments matched to this client"
              action={
                <button
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#2E5FA5] hover:bg-[#F4F7FB]"
                  aria-pressed={showHoldingCost}
                  aria-label={showHoldingCost ? "Hide NAV and Purchase Portfolio" : "Show NAV and Purchase Portfolio"}
                  onClick={() => setShowHoldingCost((current) => !current)}
                >
                  {showHoldingCost ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              }
            >
              {holdingsByDate.length === 0 ? (
                <Empty>Nothing recorded yet.</Empty>
              ) : (
                <>
              {holdingsByDate.some((row) => row.allotmentDate || row.pan) ? (
                <Table
                  {...visibleHoldingColumns(
                    ["ISIN", "Description", "Allotment date", "Allottee", "PAN", "Units", "NAV", "Current NAV", "Purchase Portfolio", "P&L"],
                    [
                    ...holdingsByDate.map((row) => [
                      row.identifier,
                      row.name,
                      row.allotmentDate ? formatDate(row.allotmentDate) : "—",
                      row.allotteeName || "—",
                      row.pan || "—",
                      formatQuantity(row.quantity),
                      <HoldingNavEditor key={row.id} code={code} holdingId={row.id} value={row.costNav} onSaved={(text, ok) => { setMessage(text); if (ok) reload(); }} />,
                      data.currentNav != null ? formatNav(data.currentNav) : "—",
                      formatPortfolio(purchasePortfolio.get(row.id)),
                      formatPnl(row.pnl),
                    ]),
                    [
                      "Merged",
                      "",
                      "",
                      "",
                      "",
                      formatQuantity(holdingsByDate.reduce((sum, row) => sum + row.quantity, 0)),
                      "",
                      data.currentNav != null ? formatNav(data.currentNav) : "—",
                      "",
                      formatPnl(holdingsByDate.reduce((sum, row) => sum + row.pnl, 0)),
                    ],
                  ],
                    showHoldingCost,
                  )}
                />
              ) : (
                <Table
                  {...visibleHoldingColumns(
                    ["Identifier", "Name", "Quantity", "Avg cost", "Current NAV", "Purchase Portfolio", "P&L"],
                    holdingsByDate.map((row) => [
                    row.identifier,
                    row.name,
                    formatQuantity(row.quantity),
                    formatInr(row.averageCost),
                    data.currentNav != null ? formatNav(data.currentNav) : "—",
                    formatInr(purchasePortfolio.get(row.id) ?? Math.round(row.quantity * row.averageCost * 100) / 100),
                    <span key={row.id} className={row.pnl < 0 ? "font-medium text-danger" : "font-medium text-[#157A45]"}>
                      {formatInr(row.pnl)}
                    </span>,
                  ]),
                    showHoldingCost,
                  )}
                />
              )}
              <HoldingsTotals portfolio={currentPortfolio} pnl={currentPnl} />
                </>
              )}
            </DataCard>
          ) : null}

          {tab === "Ledger" ? (
            <DataCard icon={<ListIcon />} title="Ledger" subtitle="Capital movements and running balance">
              {data.portal.ledger.length === 0 ? (
                <Empty>Nothing recorded yet.</Empty>
              ) : (
                <Table
                  columns={["Date", "Particulars", "Vch Type", "Vch No.", "Debit", "Credit", "Balance"]}
                  rows={data.portal.ledger.map((row) => [
                    formatDate(row.date),
                    row.particulars?.trim() || row.narration,
                    row.vchType || "—",
                    row.vchNo || "—",
                    row.type === "debit" ? formatInr(row.amount) : "—",
                    row.type === "credit" ? formatInr(row.amount) : "—",
                    formatInr(row.balance),
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
              <Metric label="Unrealized P&L" value={formatInr(data.portal.metrics.unrealizedPnl)} note="After one year, current value minus that allotment’s purchase NAV" signed={data.portal.metrics.unrealizedPnl} />
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

function relationshipChoice(value: string) {
  if (!value) return "";
  if (relationships.includes(value as (typeof relationships)[number]) && value !== "Other") return value;
  return "Other";
}

function Field({
  name,
  label,
  defaultValue,
  readOnly = false,
  inputMode,
  maxLength,
  digitsOnly = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  readOnly?: boolean;
  inputMode?: "numeric";
  maxLength?: number;
  digitsOnly?: boolean;
}) {
  return (
    <label className="text-sm">
      <FieldLabel>{label}</FieldLabel>
      <input
        name={name}
        defaultValue={defaultValue}
        readOnly={readOnly}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={
          digitsOnly
            ? (event) => {
                event.target.value = event.target.value.replace(/\D/g, "").slice(0, maxLength);
              }
            : undefined
        }
        className={`${fieldClass} ${readOnly ? "bg-[#F4F7FB]" : ""}`}
      />
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
        <Field name="bankName" label="Bank Name" defaultValue={bank.bankName} />
        <Field name="accountHolderName" label="Account Holder Name" defaultValue={bank.accountHolderName} />
        <Field name="accountNumber" label="Account Number" defaultValue={bank.accountNumber} />
        <Field name="ifsccode" label="IFSC Code" defaultValue={bank.ifsccode} />
        <Field name="micrCode" label="MICR Code" defaultValue={bank.micrCode} />
        <Field name="bankCity" label="Bank City" defaultValue={bank.bankCity} />
        <Select name="accountType" label="Account Type" defaultValue={bank.accountType}>
          <option value="">Select account type</option>
          {accountTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <div className="md:col-span-2 xl:col-span-3">
          <Field name="bankAddress" label="Bank Address" defaultValue={bank.bankAddress ?? ""} />
        </div>
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
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <SectionHeading icon={icon} title={title} subtitle={subtitle} />
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const hiddenHoldingColumns = new Set(["NAV", "Purchase Portfolio"]);

function visibleHoldingColumns(columns: string[], rows: ReactNode[][], showCost: boolean) {
  if (showCost) return { columns, rows };
  const kept = columns.map((column, index) => (hiddenHoldingColumns.has(column) ? -1 : index)).filter((index) => index >= 0);
  return {
    columns: kept.map((index) => columns[index]),
    rows: rows.map((row) => kept.map((index) => row[index])),
  };
}

function EyeIcon() {
  return (
    <Icon>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
    </Icon>
  );
}

function EyeOffIcon() {
  return (
    <Icon>
      <path d="M4 5.5 20 18.5" strokeLinecap="round" />
      <path d="M9.2 8.2A8 8 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a17 17 0 0 1-3.2 3.6M14.2 14.4A2.5 2.5 0 0 1 9.8 11M6.2 9.1C4.2 10.5 2.5 12 2.5 12S6 17.5 12 17.5c1.2 0 2.3-.3 3.3-.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function HoldingNavEditor({
  code,
  holdingId,
  value,
  onSaved,
}: {
  code: string;
  holdingId: string;
  value: number | undefined;
  onSaved: (message: string, ok: boolean) => void;
}) {
  const [nav, setNav] = useState(value == null ? "" : String(value));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setNav(value == null ? "" : String(value));
  }, [value]);

  async function save() {
    const next = Number(nav);
    if (!Number.isFinite(next) || next <= 0) {
      onSaved("Enter a NAV greater than zero.", false);
      return;
    }
    setPending(true);
    const response = await apiFetch(api.admin.clientHoldingNav(code), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdingId, nav: next }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setPending(false);
    onSaved(response.ok ? "NAV updated." : payload.message ?? "The NAV could not be saved.", response.ok);
  }

  return (
    <span className="flex items-center gap-2">
      <input
        value={nav}
        inputMode="decimal"
        aria-label="NAV"
        onChange={(event) => setNav(event.target.value)}
        className="w-28 rounded-xl border border-[#E3E8EF] bg-white px-2 py-1.5 text-right text-sm text-[#16324F] outline-none focus:border-[#F97316]"
      />
      <button type="button" onClick={() => void save()} disabled={pending} className="rounded-full border border-[#D5DDE6] bg-white px-3 py-1.5 text-xs font-medium text-[#1B3C6C] hover:bg-[#F8FAFC] disabled:opacity-60">
        {pending ? "Saving..." : "Save"}
      </button>
    </span>
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

function HoldingsTotals({ portfolio, pnl }: { portfolio: number | null; pnl: number }) {
  const tone = pnl < 0 ? "text-danger" : pnl > 0 ? "text-[#157A45]" : "text-[#16324F]";
  return (
    <div className="grid gap-4 border-t border-[#E6EDF5] px-5 py-5 sm:grid-cols-2">
      <div>
        <p className="text-sm font-medium text-[#7B8794]">Current portfolio</p>
        <p className="mt-1 text-xl font-semibold tracking-tight text-[#16324F]">{portfolio == null ? "—" : formatInr(portfolio)}</p>
        <p className="mt-1 text-xs text-[#7B8794]">Total units × current NAV</p>
      </div>
      <div>
        <p className="text-sm font-medium text-[#7B8794]">Current P&L</p>
        <p className={`mt-1 text-xl font-semibold tracking-tight ${tone}`}>{formatPnl(pnl)}</p>
        <p className="mt-1 text-xs text-[#7B8794]">After one year, current value minus that allotment’s purchase NAV</p>
      </div>
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

function KeyIcon() {
  return (
    <Icon>
      <circle cx="8" cy="15" r="3.2" />
      <path d="M10.6 13.2 19 5.2M16.2 7.6l2.2 2.2M14 9.6l2 2" strokeLinecap="round" strokeLinejoin="round" />
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

function purchasePortfolioByHolding(rows: Array<{ id: string; quantity: number; costNav?: number }>) {
  let units = 0;
  const values = new Map<string, number | null>();
  rows.forEach((row) => {
    units += row.quantity;
    const purchase = row.costNav;
    values.set(row.id, purchase == null || !Number.isFinite(purchase) ? null : Math.round(units * purchase * 100) / 100);
  });
  return values;
}

function formatPortfolio(value: number | null | undefined) {
  return value == null ? "—" : formatInr(value);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
