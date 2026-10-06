"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, apiFetch } from "@/config/endapi";
import { accountTypes, maxAdultDob, validateCreateClient } from "@/lib/client-validation";
import type { BankAccount, Nominee } from "@/lib/types";
import { errorClass } from "@/components/ui/classes";
import DateField from "@/components/ui/DateField";

const relationships = ["Spouse", "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Husband", "Wife", "Guardian", "Other"] as const;

type NomineeDraft = Nominee & { relationshipChoice: string; relationshipOther: string };

const emptyNominee = (): NomineeDraft => ({
  name: "",
  relationship: "",
  relationshipChoice: "",
  relationshipOther: "",
});

const emptyBank = (): BankAccount => ({
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
});

export default function ClientForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [pan, setPan] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [tradingCode, setTradingCode] = useState("");
  const [status, setStatus] = useState("active");
  const [kra, setKra] = useState(false);
  const [nominees, setNominees] = useState<NomineeDraft[]>([emptyNominee()]);
  const [bank, setBank] = useState<BankAccount>(emptyBank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [branchNote, setBranchNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const adultDob = maxAdultDob();

  function updateNominee(index: number, patch: Partial<NomineeDraft>) {
    setNominees((current) => current.map((nominee, item) => (item === index ? { ...nominee, ...patch } : nominee)));
  }

  function updateBank(patch: Partial<BankAccount>) {
    setBank((current) => ({ ...current, ...patch }));
  }

  function resetForm() {
    setFullName("");
    setFatherName("");
    setMotherName("");
    setEmail("");
    setMobile("");
    setPan("");
    setDateOfBirth("");
    setAddress("");
    setTradingCode("");
    setStatus("active");
    setKra(false);
    setNominees([emptyNominee()]);
    setBank(emptyBank());
    setErrors({});
    setFormError(null);
    setBranchNote(null);
  }

  useEffect(() => {
    const ifsc = bank.ifsccode.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setBranchNote(null);
      return;
    }
    let active = true;
    setBranchNote("Looking up this IFSC…");
    void (async () => {
      try {
        const response = await apiFetch(api.admin.ifsc(ifsc));
        const data = (await response.json().catch(() => ({}))) as {
          bankName?: string;
          micrCode?: string;
          message?: string;
        };
        if (!active) return;
        if (!response.ok || !data.bankName) {
          setBranchNote(data.message ?? "That IFSC is not in the public directory. Enter the bank details.");
          return;
        }
        setBank((current) => {
          if (current.ifsccode.trim().toUpperCase() !== ifsc) return current;
          return {
            ...current,
            bankName: data.bankName || current.bankName,
            micrCode: data.micrCode || current.micrCode,
          };
        });
        setBranchNote("Bank name and MICR are filled from the public IFSC directory. Enter the bank city and choose the account type.");
      } catch {
        if (active) setBranchNote("The bank directory could not be reached. Enter the bank details.");
      }
    })();
    return () => {
      active = false;
    };
  }, [bank.ifsccode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const preparedNominees = nominees.map((nominee) => ({
      name: nominee.name,
      relationship: nominee.relationshipChoice === "Other" ? nominee.relationshipOther : nominee.relationshipChoice,
    }));
    const parsed = validateCreateClient({
      fullName,
      fatherName,
      motherName,
      email,
      mobile,
      pan,
      dateOfBirth,
      address,
      tradingCode,
      nominees: preparedNominees,
      bank,
      status,
      kra,
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setFormError(parsed.message);
      return;
    }

    setErrors({});
    setPending(true);
    const response = await apiFetch(api.admin.clients, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.value),
    });
    const data = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    setPending(false);
    if (!response.ok || !data.code) {
      setFormError(data.message ?? "The client could not be created.");
      return;
    }
    router.push(`/admin/clients/${data.code}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <section className={cardClass}>
        <SectionHeading index="1" icon={<UserIcon />} title="Personal Details" subtitle="Basic information about the client" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TextField required icon={<UserIcon />} label="Full name" value={fullName} error={errors.fullName} onChange={setFullName} autoComplete="name" placeholder="Enter full name" />
          <TextField required label="Father's name" value={fatherName} error={errors.fatherName} onChange={setFatherName} autoComplete="off" placeholder="Enter father's name" />
          <TextField required label="Mother's name" value={motherName} error={errors.motherName} onChange={setMotherName} autoComplete="off" placeholder="Enter mother's name" />
          <label className="text-sm">
            <FieldLabel required>DOB</FieldLabel>
            <DateField
              required
              min="1900-01-01"
              max={adultDob}
              value={dateOfBirth}
              onChange={setDateOfBirth}
              className={`${fieldClass} pr-10! ${errors.dateOfBirth ? "border-danger" : ""}`}
            />
            {errors.dateOfBirth ? <span className={`mt-1 block ${errorClass}`}>{errors.dateOfBirth}</span> : null}
          </label>
          <TextField required icon={<MailIcon />} label="Email" type="email" value={email} error={errors.email} onChange={setEmail} autoComplete="email" inputMode="email" placeholder="example@domain.com" />
          <TextField
            required
            icon={<PhoneIcon />}
            label="Mobile"
            value={mobile}
            error={errors.mobile}
            onChange={setMobile}
            autoComplete="tel"
            inputMode="numeric"
            placeholder="10-digit mobile number"
            maxLength={10}
            digitsOnly
          />
          <TextField
            required
            icon={<CardIcon />}
            label="PAN"
            value={pan}
            error={errors.pan}
            onChange={setPan}
            autoComplete="off"
            maxLength={10}
            placeholder="ABCDE1234F"
            panFormat
          />
          <TextField required icon={<PinIcon />} className="xl:col-span-2" label="Address" value={address} error={errors.address} onChange={setAddress} autoComplete="street-address" placeholder="Enter full address" />
        </div>
      </section>

      <section className={cardClass}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SectionHeading className="mb-0" index="2" icon={<UsersIcon />} title="Nominees" subtitle="Add nominee details for the account" />
          <button type="button" className={outlineButtonClass} onClick={() => setNominees((current) => [...current, emptyNominee()])}>
            <PlusIcon />
            Add nominee
          </button>
        </div>
        {errors.nominees ? <p className={`mb-3 ${errorClass}`}>{errors.nominees}</p> : null}
        <div className="flex flex-col gap-4">
          {nominees.map((nominee, index) => (
            <div key={index} className="grid gap-4 md:grid-cols-2">
              <p className="text-sm font-medium text-[#1B3C6C] md:col-span-2">Nominee {index + 1}</p>
              <TextField
                required
                icon={<UserIcon />}
                label="Nominee name"
                value={nominee.name}
                error={errors[`nominees.${index}.name`]}
                onChange={(value) => updateNominee(index, { name: value })}
                placeholder="Enter nominee name"
              />
              <SelectField
                required
                label="Nominee relationship"
                value={nominee.relationshipChoice}
                error={nominee.relationshipChoice === "Other" ? undefined : errors[`nominees.${index}.relationship`]}
                onChange={(value) => updateNominee(index, { relationshipChoice: value })}
                placeholder="Select relationship"
                options={relationships.map((relationship) => ({ value: relationship, label: relationship }))}
              />
              {nominee.relationshipChoice === "Other" ? (
                <TextField
                  required
                  label="Relationship"
                  value={nominee.relationshipOther}
                  error={errors[`nominees.${index}.relationship`]}
                  onChange={(value) => updateNominee(index, { relationshipOther: value })}
                  placeholder="Enter relationship"
                />
              ) : null}
              {nominees.length > 1 ? (
                <div className="md:col-span-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-[#F97316] hover:underline"
                    onClick={() => setNominees((current) => current.filter((_, item) => item !== index))}
                  >
                    Remove nominee
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <SectionHeading index="3" icon={<BankIcon />} title="Bank Details" subtitle="Bank account and IFSC details" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TextField required label="Account holder name" value={bank.accountHolderName} error={errors["bank.accountHolderName"]} onChange={(value) => updateBank({ accountHolderName: value })} placeholder="Enter account holder name" />
          <TextField required label="Account number" value={bank.accountNumber} error={errors["bank.accountNumber"]} onChange={(value) => updateBank({ accountNumber: value })} inputMode="numeric" placeholder="Enter account number" />
          <TextField required label="IFSC code" value={bank.ifsccode} error={errors["bank.ifsccode"]} onChange={(value) => updateBank({ ifsccode: value.toUpperCase() })} maxLength={11} placeholder="Enter IFSC code" />
          {branchNote ? <p className="text-xs text-muted md:col-span-2 xl:col-span-3">{branchNote}</p> : null}
          <TextField required label="Bank name" value={bank.bankName} error={errors["bank.bankName"]} onChange={(value) => updateBank({ bankName: value })} placeholder="Enter bank name" />
          <TextField required label="Bank city" value={bank.bankCity} error={errors["bank.bankCity"]} onChange={(value) => updateBank({ bankCity: value })} placeholder="Enter bank city" />
          <SelectField
            required
            label="Account type"
            value={bank.accountType}
            error={errors["bank.accountType"]}
            onChange={(value) => updateBank({ accountType: value })}
            placeholder="Select account type"
            options={accountTypes.map((type) => ({ value: type, label: type }))}
          />
          <TextField icon={<AtIcon />} label="UPI ID" value={bank.upiId} error={errors["bank.upiId"]} onChange={(value) => updateBank({ upiId: value })} placeholder="name@bank" />
          <TextField icon={<TargetIcon />} label="MICR code" value={bank.micrCode} error={errors["bank.micrCode"]} onChange={(value) => updateBank({ micrCode: value })} inputMode="numeric" maxLength={9} placeholder="Enter MICR code" />
          <TextField required icon={<TrendIcon />} label="Trading Code" value={tradingCode} error={errors.tradingCode} onChange={setTradingCode} placeholder="Enter trading code" />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-[#1B3C6C]">
          <input
            type="checkbox"
            checked={bank.isPrimary}
            onChange={(event) => updateBank({ isPrimary: event.target.checked })}
            className="h-4 w-4 accent-[#F97316]"
          />
          Primary account
        </label>
        {errors["bank.isPrimary"] ? <p className={`mt-2 ${errorClass}`}>{errors["bank.isPrimary"]}</p> : null}
      </section>

      <section className={cardClass}>
        <SectionHeading index="4" icon={<ShieldIcon />} title="Status" subtitle="Set the client status and KRA verification" />
        <div className="flex flex-wrap items-end gap-6">
          <div className="w-full max-w-xs">
            <SelectField
              required
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
          <label className="mb-2.5 flex items-center gap-2 text-sm font-medium text-[#1B3C6C]">
            <input type="checkbox" checked={kra} onChange={(event) => setKra(event.target.checked)} className="h-4 w-4 accent-[#F97316]" />
            KRA verified
          </label>
        </div>
        {formError ? <p className={`mt-4 ${errorClass}`}>{formError}</p> : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs text-[#7B8794]">
            <InfoIcon />
            The investor can sign in with password 123456.
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={resetForm} className="rounded-full border border-[#D5DDE6] bg-white px-5 py-2.5 text-sm font-medium text-[#1B3C6C] hover:bg-[#F8FAFC]">
              Reset
            </button>
            <button type="submit" disabled={pending} className="rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)] hover:bg-[#EA6C0C] disabled:cursor-not-allowed disabled:opacity-60">
              {pending ? "Saving..." : "Create Client"}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}

const cardClass = "rounded-2xl border border-[#E6EDF5] bg-white p-5 shadow-[0_8px_24px_rgba(20,50,90,0.05)]";
const fieldClass =
  "w-full rounded-xl border border-[#E3E8EF] bg-white py-2.5 pl-3 pr-3 text-sm text-foreground outline-none placeholder:text-[#9AA3AF] focus:border-[#F97316]";
const outlineButtonClass =
  "inline-flex items-center gap-1.5 rounded-full border border-[#F97316] bg-white px-4 py-2 text-sm font-medium text-[#F97316] hover:bg-[#FFF4EC]";

function FieldLabel({ required = false, children }: { required?: boolean; children: string }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-[#1B3C6C]">
      {children}
      {required ? <span className="text-[#F97316]"> *</span> : null}
    </span>
  );
}

function SectionHeading({
  index,
  icon,
  title,
  subtitle,
  className = "mb-5",
}: {
  index: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">
        {index}
      </span>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#2E5FA5]">{icon}</span>
      <div>
        <h2 className="text-[15px] font-semibold text-[#16324F]">{title}</h2>
        <p className="text-xs text-[#7B8794]">{subtitle}</p>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  maxLength,
  digitsOnly = false,
  panFormat = false,
  required = false,
  icon,
  className = "",
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "email" | "tel" | "numeric" | "text";
  placeholder?: string;
  maxLength?: number;
  digitsOnly?: boolean;
  panFormat?: boolean;
  required?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const [caret, setCaret] = useState(0);
  const panDigitSlot = panFormat && caret >= 5 && caret <= 8;

  function rememberCaret(input: HTMLInputElement) {
    setCaret(input.selectionStart ?? input.value.length);
  }

  return (
    <label className={`text-sm ${className}`}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <span className="relative block">
        {icon ? <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-[#8B95A5]">{icon}</span> : null}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={panFormat ? (panDigitSlot ? "numeric" : "text") : inputMode}
        autoCapitalize={panFormat ? "characters" : undefined}
        spellCheck={panFormat ? false : undefined}
        placeholder={placeholder}
        maxLength={maxLength}
        onSelect={(event) => rememberCaret(event.currentTarget)}
        onKeyUp={(event) => rememberCaret(event.currentTarget)}
        onClick={(event) => rememberCaret(event.currentTarget)}
        onBeforeInput={(event) => {
          const data = event.nativeEvent.data;
          if (!data) return;
          if (digitsOnly && /\D/.test(data)) event.preventDefault();
          if (panFormat && data.length === 1 && !panCharFits(event.currentTarget.selectionStart ?? value.length, data)) {
            event.preventDefault();
          }
        }}
        onPaste={(event) => {
          if (!digitsOnly && !panFormat) return;
          event.preventDefault();
          const input = event.currentTarget;
          const start = input.selectionStart ?? value.length;
          const end = input.selectionEnd ?? value.length;
          const pasted = event.clipboardData.getData("text");
          const merged = `${value.slice(0, start)}${pasted}${value.slice(end)}`;
          if (digitsOnly) {
            const next = merged.replace(/\D/g, "");
            onChange(maxLength ? next.slice(0, maxLength) : next);
            return;
          }
          onChange(maskPan(merged));
        }}
        onChange={(event) => {
          if (digitsOnly) {
            const next = event.target.value.replace(/\D/g, "");
            onChange(maxLength ? next.slice(0, maxLength) : next);
            return;
          }
          if (panFormat) {
            onChange(maskPan(event.target.value));
            return;
          }
          onChange(event.target.value);
        }}
        className={`${fieldClass} ${icon ? "pl-10!" : ""} ${error ? "border-danger" : ""}`}
        aria-invalid={error ? true : undefined}
      />
      </span>
      {error ? <span className={`mt-1 block ${errorClass}`}>{error}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  error,
  onChange,
  options,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      <FieldLabel required={required}>{label}</FieldLabel>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} appearance-none pr-10! ${value ? "" : "text-[#9AA3AF]"} ${error ? "border-danger" : ""}`}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#8B95A5]">
          <ChevronDown />
        </span>
      </span>
      {error ? <span className={`mt-1 block ${errorClass}`}>{error}</span> : null}
    </label>
  );
}

function panCharFits(index: number, char: string) {
  const letter = char.toUpperCase();
  if (index < 5 || index === 9) return /^[A-Z]$/.test(letter);
  if (index < 9) return /^\d$/.test(letter);
  return false;
}

function maskPan(value: string) {
  let next = "";
  for (const char of value) {
    if (next.length >= 10) break;
    const letter = char.toUpperCase();
    if (panCharFits(next.length, letter)) next += letter;
  }
  return next;
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

function MailIcon() {
  return (
    <Icon>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m5 7 7 6 7-6" strokeLinejoin="round" />
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

function CardIcon() {
  return (
    <Icon>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h4" strokeLinecap="round" />
    </Icon>
  );
}

function PinIcon() {
  return (
    <Icon>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2" />
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
      <path d="M12 3.5 19 6.2v5.3c0 4-2.8 6.8-7 8.5-4.2-1.7-7-4.5-7-8.5V6.2L12 3.5Z" strokeLinejoin="round" />
    </Icon>
  );
}

function AtIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M15 12v1.2a1.8 1.8 0 0 0 3.2 1.1A7 7 0 1 1 16.5 6.5" strokeLinecap="round" />
    </Icon>
  );
}

function TargetIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 6v12M6 12h12" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
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
