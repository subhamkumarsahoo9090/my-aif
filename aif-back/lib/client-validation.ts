import type { BankAccount, ClientStatus, InvestorProfile, Nominee } from "./types.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const personNamePattern = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
const placePattern = /^[A-Za-z][A-Za-z .'-]{1,59}$/;
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const accountNumberPattern = /^\d{9,18}$/;
const micrPattern = /^\d{9}$/;
const upiPattern = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const dpOrderPattern = /^[A-Za-z0-9-]{1,40}$/;

export const accountTypes = ["Savings", "Current", "NRE", "NRO"] as const;

export type CreateClientInput = {
  fullName: string;
  email: string;
  mobile: string;
  pan: string;
  dateOfBirth: string;
  address: string;
  nominees: Nominee[];
  bank: BankAccount;
  status: ClientStatus;
  kra: boolean;
};

export function normalizeMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function maxAdultDob(today = new Date()) {
  const date = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function ageInYears(iso: string, today = new Date()) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null;
  let age = today.getFullYear() - year;
  const monthDelta = today.getMonth() - (month - 1);
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < day)) age -= 1;
  return age;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateCreateClient(input: {
  fullName: string;
  email: string;
  mobile: string;
  pan: string;
  dateOfBirth: string;
  address: string;
  nominees: Nominee[];
  bank: BankAccount;
  status: string;
  kra: boolean;
}): { ok: true; value: CreateClientInput } | { ok: false; errors: Record<string, string>; message: string } {
  const errors: Record<string, string> = {};
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const mobile = normalizeMobile(input.mobile);
  const pan = input.pan.trim().toUpperCase();
  const dateOfBirth = input.dateOfBirth.trim();
  const address = input.address.trim();

  if (!fullName) errors.fullName = "Enter the full name.";
  else if (!personNamePattern.test(fullName)) errors.fullName = "Use letters only, at least 2 characters.";

  if (!email) errors.email = "Enter the email address.";
  else if (!emailPattern.test(email)) errors.email = "Enter a valid email address, such as name@example.com.";

  if (!input.mobile.trim()) errors.mobile = "Enter the mobile number.";
  else if (!/^[6-9]\d{9}$/.test(mobile)) errors.mobile = "Enter a 10-digit Indian mobile number starting with 6, 7, 8, or 9.";

  if (!pan) errors.pan = "Enter the PAN.";
  else if (!panPattern.test(pan)) errors.pan = "Enter a valid PAN, such as ABCDE1234F.";

  if (!dateOfBirth) errors.dateOfBirth = "Choose the date of birth.";
  else if (ageInYears(dateOfBirth) == null) errors.dateOfBirth = "Choose a valid date of birth.";
  else if (ageInYears(dateOfBirth)! < 18) errors.dateOfBirth = "The investor must be at least 18 years old.";

  if (!address) errors.address = "Enter the address.";
  else if (address.length < 5) errors.address = "Enter the full address.";
  else if (address.length > 240) errors.address = "Address must be 240 characters or fewer.";

  if (!input.nominees.length) errors.nominees = "Add at least one nominee.";
  const nominees = input.nominees.map((nominee) => ({
    name: nominee.name.trim(),
    relationship: nominee.relationship.trim(),
  }));
  nominees.forEach((nominee, index) => {
    if (!nominee.name) errors[`nominees.${index}.name`] = "Enter the nominee name.";
    else if (!personNamePattern.test(nominee.name)) errors[`nominees.${index}.name`] = "Use letters only for the nominee name.";
    if (!nominee.relationship) errors[`nominees.${index}.relationship`] = "Choose the nominee relationship.";
    else if (!placePattern.test(nominee.relationship)) errors[`nominees.${index}.relationship`] = "Use letters only for the relationship.";
  });

  const bank = input.bank;
  const accountNumber = bank.accountNumber.replace(/\s/g, "");
  const ifsccode = bank.ifsccode.trim().toUpperCase();
  const accountHolderName = bank.accountHolderName.trim();
  const upiId = bank.upiId.trim();
  const bankCity = bank.bankCity.trim();
  const bankName = bank.bankName.trim();
  const micrCode = bank.micrCode.replace(/\s/g, "");
  const accountType = bank.accountType.trim();
  const dpOrderId = bank.dpOrderId.trim();

  if (!accountNumber) errors["bank.accountNumber"] = "Enter the account number.";
  else if (!accountNumberPattern.test(accountNumber)) errors["bank.accountNumber"] = "Account number must be 9 to 18 digits.";

  if (!ifsccode) errors["bank.ifsccode"] = "Enter the IFSC code.";
  else if (!ifscPattern.test(ifsccode)) errors["bank.ifsccode"] = "Enter a valid IFSC, such as HDFC0000621.";

  if (!accountHolderName) errors["bank.accountHolderName"] = "Enter the account holder name.";
  else if (!personNamePattern.test(accountHolderName)) errors["bank.accountHolderName"] = "Use letters only for the account holder name.";

  if (upiId && !upiPattern.test(upiId)) errors["bank.upiId"] = "Enter a valid UPI ID, such as name@bank.";

  if (!bankCity) errors["bank.bankCity"] = "Enter the bank city.";
  else if (!placePattern.test(bankCity)) errors["bank.bankCity"] = "Use letters only for the bank city.";

  if (!bankName) errors["bank.bankName"] = "Enter the bank name.";
  else if (!/^[A-Za-z0-9][A-Za-z0-9 .&'-]{1,79}$/.test(bankName)) errors["bank.bankName"] = "Enter a valid bank name.";

  if (micrCode && !micrPattern.test(micrCode)) errors["bank.micrCode"] = "MICR code must be 9 digits.";

  if (!accountType) errors["bank.accountType"] = "Choose the account type.";
  else if (!accountTypes.includes(accountType as (typeof accountTypes)[number])) errors["bank.accountType"] = "Choose Savings, Current, NRE, or NRO.";

  if (!bank.isPrimary) errors["bank.isPrimary"] = "Mark this bank account as primary.";

  if (dpOrderId && !dpOrderPattern.test(dpOrderId)) errors["bank.dpOrderId"] = "DP order ID can use letters, numbers, and hyphens only.";

  const status: ClientStatus = input.status === "inactive" ? "inactive" : "active";
  if (input.status !== "active" && input.status !== "inactive") errors.status = "Choose a status.";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: Object.values(errors)[0] };
  }

  return {
    ok: true,
    value: {
      fullName,
      email,
      mobile,
      pan,
      dateOfBirth,
      address,
      nominees,
      bank: {
        accountNumber,
        ifsccode,
        accountHolderName,
        upiId,
        bankCity,
        bankName,
        micrCode,
        accountType,
        isPrimary: true,
        dpOrderId,
      },
      status,
      kra: input.kra,
    },
  };
}

export function readCreateClientBody(body: unknown) {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!record) {
    return { ok: false as const, errors: { form: "Enter the client details." }, message: "Enter the client details." };
  }
  const nominees = Array.isArray(record.nominees)
    ? record.nominees.map((item) => {
        const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return { name: text(row.name), relationship: text(row.relationship) };
      })
    : [];
  const bankRecord = record.bank && typeof record.bank === "object" ? (record.bank as Record<string, unknown>) : {};
  return validateCreateClient({
    fullName: text(record.fullName),
    email: text(record.email),
    mobile: text(record.mobile),
    pan: text(record.pan),
    dateOfBirth: text(record.dateOfBirth),
    address: text(record.address),
    nominees,
    bank: {
      accountNumber: text(bankRecord.accountNumber),
      ifsccode: text(bankRecord.ifsccode),
      accountHolderName: text(bankRecord.accountHolderName),
      upiId: text(bankRecord.upiId),
      bankCity: text(bankRecord.bankCity),
      bankName: text(bankRecord.bankName),
      micrCode: text(bankRecord.micrCode),
      accountType: text(bankRecord.accountType),
      isPrimary: bankRecord.isPrimary === true,
      dpOrderId: text(bankRecord.dpOrderId),
    },
    status: text(record.status) || "active",
    kra: record.kra === true,
  });
}

export function nomineeList(profile: Pick<InvestorProfile, "nominees" | "nomineeName" | "nomineeRelationship">) {
  if (profile.nominees?.length) return profile.nominees;
  if (profile.nomineeName) return [{ name: profile.nomineeName, relationship: profile.nomineeRelationship }];
  return [];
}

export function bankList(profile: Pick<InvestorProfile, "banks" | "bankName" | "accountNumber" | "ifsc" | "fullName">) {
  if (profile.banks?.length) return profile.banks;
  if (!profile.bankName && !profile.accountNumber && !profile.ifsc) return [];
  return [
    {
      accountNumber: profile.accountNumber,
      ifsccode: profile.ifsc,
      accountHolderName: profile.fullName,
      upiId: "",
      bankCity: "",
      bankName: profile.bankName,
      micrCode: "",
      accountType: "",
      isPrimary: true,
      dpOrderId: "",
    },
  ];
}
