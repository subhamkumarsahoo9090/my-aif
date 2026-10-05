"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiFetch } from "@/config/endapi";
import { accountTypes, maxAdultDob, validateCreateClient } from "@/lib/client-validation";
import type { BankAccount, Nominee } from "@/lib/types";
import { errorClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/classes";

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

function openCalendar(input: HTMLInputElement) {
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch {
    // The native date control still opens its calendar.
  }
}

export default function ClientForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [pan, setPan] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
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
      email,
      mobile,
      pan,
      dateOfBirth,
      address,
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
    <form onSubmit={onSubmit} noValidate className="grid gap-4 rounded-2xl border border-border bg-white p-5 shadow-[0_10px_24px_rgba(20,50,90,0.05)] lg:grid-cols-3">
      <TextField label="Full name" value={fullName} error={errors.fullName} onChange={setFullName} autoComplete="name" />
      <TextField label="Email" type="email" value={email} error={errors.email} onChange={setEmail} autoComplete="email" inputMode="email" />
      <TextField
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
        label="PAN"
        value={pan}
        error={errors.pan}
        onChange={setPan}
        autoComplete="off"
        maxLength={10}
        placeholder="ABCDE1234F"
        panFormat
      />
      <label className="text-sm">
        <span className={labelClass}>Date of birth</span>
        <input
          type="date"
          required
          min="1900-01-01"
          max={adultDob}
          value={dateOfBirth}
          onChange={(event) => setDateOfBirth(event.target.value)}
          onClick={(event) => openCalendar(event.currentTarget)}
          className={`${inputClass} ${errors.dateOfBirth ? "border-danger" : ""}`}
          style={{ colorScheme: "light" }}
        />
        {errors.dateOfBirth ? <span className={`mt-1 block ${errorClass}`}>{errors.dateOfBirth}</span> : null}
      </label>
      <TextField label="Address" value={address} error={errors.address} onChange={setAddress} autoComplete="street-address" />

      <section className="grid gap-4 rounded-xl border border-border p-4 lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Nominees</h2>
          <button type="button" className={secondaryButtonClass} onClick={() => setNominees((current) => [...current, emptyNominee()])}>
            Add nominee
          </button>
        </div>
        {errors.nominees ? <p className={errorClass}>{errors.nominees}</p> : null}
        {nominees.map((nominee, index) => (
          <div key={index} className="grid gap-4 border-t border-border pt-4 lg:grid-cols-3">
            <TextField
              label={`Nominee ${index + 1}`}
              value={nominee.name}
              error={errors[`nominees.${index}.name`]}
              onChange={(value) => updateNominee(index, { name: value })}
            />
            <label className="text-sm">
              <span className={labelClass}>Nominee relationship</span>
              <select
                value={nominee.relationshipChoice}
                onChange={(event) => updateNominee(index, { relationshipChoice: event.target.value })}
                className={`${inputClass} ${errors[`nominees.${index}.relationship`] ? "border-danger" : ""}`}
              >
                <option value="">Select relationship</option>
                {relationships.map((relationship) => (
                  <option key={relationship} value={relationship}>
                    {relationship}
                  </option>
                ))}
              </select>
              {nominee.relationshipChoice !== "Other" && errors[`nominees.${index}.relationship`] ? (
                <span className={`mt-1 block ${errorClass}`}>{errors[`nominees.${index}.relationship`]}</span>
              ) : null}
            </label>
            {nominee.relationshipChoice === "Other" ? (
              <TextField
                label="Relationship"
                value={nominee.relationshipOther}
                error={errors[`nominees.${index}.relationship`]}
                onChange={(value) => updateNominee(index, { relationshipOther: value })}
              />
            ) : null}
            {nominees.length > 1 ? (
              <div className="lg:col-span-3">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setNominees((current) => current.filter((_, item) => item !== index))}
                >
                  Remove nominee
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-xl border border-border p-4 lg:col-span-3 lg:grid-cols-3">
        <h2 className="text-sm font-semibold lg:col-span-3">Bank details</h2>
        <TextField
          label="Account holder name"
          value={bank.accountHolderName}
          error={errors["bank.accountHolderName"]}
          onChange={(value) => updateBank({ accountHolderName: value })}
        />
        <TextField
          label="Account number"
          value={bank.accountNumber}
          error={errors["bank.accountNumber"]}
          onChange={(value) => updateBank({ accountNumber: value })}
          inputMode="numeric"
        />
        <TextField
          label="IFSC code"
          value={bank.ifsccode}
          error={errors["bank.ifsccode"]}
          onChange={(value) => updateBank({ ifsccode: value.toUpperCase() })}
          maxLength={11}
          placeholder="HDFC0000621"
        />
        {branchNote ? <p className="text-xs text-muted lg:col-span-3">{branchNote}</p> : null}
        <TextField label="Bank name" value={bank.bankName} error={errors["bank.bankName"]} onChange={(value) => updateBank({ bankName: value })} />
        <TextField label="Bank city" value={bank.bankCity} error={errors["bank.bankCity"]} onChange={(value) => updateBank({ bankCity: value })} />
        <label className="text-sm">
          <span className={labelClass}>Account type</span>
          <select
            value={bank.accountType}
            onChange={(event) => updateBank({ accountType: event.target.value })}
            className={`${inputClass} ${errors["bank.accountType"] ? "border-danger" : ""}`}
          >
            <option value="">Select account type</option>
            {accountTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors["bank.accountType"] ? <span className={`mt-1 block ${errorClass}`}>{errors["bank.accountType"]}</span> : null}
        </label>
        <TextField
          label="UPI ID"
          value={bank.upiId}
          error={errors["bank.upiId"]}
          onChange={(value) => updateBank({ upiId: value })}
          placeholder="name@bank"
        />
        <TextField
          label="MICR code"
          value={bank.micrCode}
          error={errors["bank.micrCode"]}
          onChange={(value) => updateBank({ micrCode: value })}
          inputMode="numeric"
          maxLength={9}
        />
        <TextField
          label="DP order ID"
          value={bank.dpOrderId}
          error={errors["bank.dpOrderId"]}
          onChange={(value) => updateBank({ dpOrderId: value })}
        />
        <label className="flex items-center gap-2 text-sm sm:mt-7">
          <input
            type="checkbox"
            checked={bank.isPrimary}
            onChange={(event) => updateBank({ isPrimary: event.target.checked })}
          />
          Primary account
        </label>
        {errors["bank.isPrimary"] ? <p className={`${errorClass} lg:col-span-3`}>{errors["bank.isPrimary"]}</p> : null}
      </section>

      <label className="text-sm">
        <span className={labelClass}>Status</span>
        <select name="status" className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm sm:mt-7">
        <input type="checkbox" checked={kra} onChange={(event) => setKra(event.target.checked)} />
        KRA verified
      </label>
      {formError ? <p className={`${errorClass} lg:col-span-3`}>{formError}</p> : null}
      <div className="lg:col-span-3">
        <button type="submit" className={primaryButtonClass} disabled={pending}>
          {pending ? "Saving..." : "Create client"}
        </button>
        <p className="mt-2 text-xs text-muted">The investor can sign in with password 123456.</p>
      </div>
    </form>
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
}) {
  const [caret, setCaret] = useState(0);
  const panDigitSlot = panFormat && caret >= 5 && caret <= 8;

  function rememberCaret(input: HTMLInputElement) {
    setCaret(input.selectionStart ?? input.value.length);
  }

  return (
    <label className="text-sm">
      <span className={labelClass}>{label}</span>
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
        className={`${inputClass} ${error ? "border-danger" : ""}`}
        aria-invalid={error ? true : undefined}
      />
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
