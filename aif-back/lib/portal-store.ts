import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "./mongo.js";
import { identifierMatches } from "./identifier.js";
import type {
  BankAccount,
  Holding,
  InvestorProfile,
  LedgerRow,
  LedgerType,
  Nominee,
  PortalData,
} from "./types.js";

type Account = {
  salt: string;
  hash: Buffer;
  version: number;
  portal: PortalData;
};

const accounts = new Map<string, Account>();

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 32);
}

function passwordsMatch(password: string, salt: string, hash: Buffer) {
  const actual = hashPassword(password, salt);
  return actual.length === hash.length && timingSafeEqual(actual, hash);
}

function ledgerRows(
  entries: Array<{
    date: string;
    type: LedgerType;
    amount: number;
    narration: string;
  }>,
): LedgerRow[] {
  let balance = 0;
  return entries.map((entry, index) => {
    balance += entry.type === "credit" ? entry.amount : -entry.amount;
    return {
      id: `txn-${index + 1}`,
      date: entry.date,
      type: entry.type,
      amount: entry.amount,
      balance,
      narration: entry.narration,
    };
  });
}

function withPnl(
  rows: Array<Omit<Holding, "pnl">>,
): Holding[] {
  return rows.map((row) => ({
    ...row,
    pnl: row.marketValue - row.quantity * row.averageCost,
  }));
}

type PortalSeed = {
  password: string;
  profile: PortalData["profile"];
  ledger: Array<{
    date: string;
    type: LedgerType;
    amount: number;
    narration: string;
  }>;
  holdings: Array<Omit<Holding, "pnl">>;
  realizedPnl: number;
  statements: PortalData["statements"];
};

function buildPortal(seed: PortalSeed): PortalData {
  const ledger = ledgerRows(seed.ledger);
  const holdings = withPnl(seed.holdings);
  const investedCapital = ledger
    .filter(
      (row) =>
        row.type === "credit" &&
        row.narration.startsWith("Capital contribution"),
    )
    .reduce((sum, row) => sum + row.amount, 0);
  const currentValuation = holdings.reduce(
    (sum, row) => sum + row.marketValue,
    0,
  );
  const unrealizedPnl = holdings.reduce((sum, row) => sum + row.pnl, 0);

  return {
    profile: seed.profile,
    metrics: {
      totalPortfolioValue: currentValuation + seed.realizedPnl,
      investedCapital,
      currentValuation,
      realizedPnl: seed.realizedPnl,
      unrealizedPnl,
    },
    ledger,
    holdings,
    statements: seed.statements,
  };
}

let portalReady: Promise<void> | null = null;

export function ready() {
  if (!portalReady) {
    portalReady = hydratePortal().catch((error) => {
      portalReady = null;
      throw error;
    });
  }
  return portalReady;
}

async function hydratePortal() {
  const db = await getDb();
  const investors = db.collection("investors");
  const securityCol = db.collection("securities");

  if ((await securityCol.countDocuments()) === 0) {
    for (const [identifier, record] of defaultSecurities) {
      await securityCol.updateOne(
        { _id: identifier },
        { $setOnInsert: { name: record.name, isin: record.isin } },
        { upsert: true },
      );
    }
  }

  accounts.clear();
  for (const doc of await investors.find().toArray()) {
    accounts.set(String(doc._id), {
      salt: String(doc.salt),
      hash: Buffer.from(String(doc.hash), "base64"),
      version: Number(doc.version),
      portal: withProfileCollections(doc.portal as PortalData),
    });
  }

  securities.clear();
  for (const doc of await securityCol.find().toArray()) {
    securities.set(String(doc._id), {
      name: String(doc.name),
      isin: String(doc.isin),
    });
  }
}

async function persistInvestor(code: string) {
  const account = accounts.get(code);
  if (!account) return;
  const db = await getDb();
  await db.collection("investors").replaceOne(
    { _id: code },
    {
      _id: code,
      salt: account.salt,
      hash: account.hash.toString("base64"),
      version: account.version,
      portal: account.portal,
    },
    { upsert: true },
  );
}

export async function removeInvestor(code: string) {
  await ready();
  if (!accounts.has(code)) return false;
  accounts.delete(code);
  const db = await getDb();
  await db.collection("investors").deleteOne({ _id: code });
  return true;
}

async function persistSecurity(identifier: string) {
  const record = securities.get(identifier);
  if (!record) return;
  const db = await getDb();
  await db.collection("securities").replaceOne(
    { _id: identifier },
    { _id: identifier, name: record.name, isin: record.isin },
    { upsert: true },
  );
}

function accountForIdentifier(identifier: string) {
  for (const account of accounts.values()) {
    if (identifierMatches(account.portal.profile, identifier)) return account;
  }
  return null;
}

export async function authenticate(identifier: string, password: string) {
  await ready();
  const account = accountForIdentifier(identifier);
  if (!account) return null;
  if (!passwordsMatch(password, account.salt, account.hash)) return null;
  return account;
}

export async function findClientCode(identifier: string) {
  await ready();
  return accountForIdentifier(identifier)?.portal.profile.tradingCode ?? null;
}

export async function getPortal(clientCode: string) {
  await ready();
  const portal = accounts.get(clientCode)?.portal;
  if (!portal) return null;
  return presentPortal(portal, await latestNavValue());
}

export async function getPasswordVersion(clientCode: string) {
  await ready();
  return accounts.get(clientCode)?.version ?? null;
}

export async function updatePassword(clientCode: string, password: string) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return false;
  const salt = randomBytes(16).toString("base64url");
  account.salt = salt;
  account.hash = hashPassword(password, salt);
  account.version += 1;
  await persistInvestor(clientCode);
  return true;
}

type SecurityRecord = { name: string; isin: string };

const defaultSecurities: Array<[string, SecurityRecord]> = [
  ["TGF-I-A", { name: "Techculture Growth Fund I - Class A", isin: "INF204K01AIF" }],
  ["IOF-II-B", { name: "Income Opportunities Fund II - Class B", isin: "INF204K01IOF" }],
];

const securities = new Map<string, SecurityRecord>();

export async function knownSecurity(identifier: string) {
  await ready();
  return securities.get(identifier.trim().toUpperCase())?.name ?? null;
}

export async function listSecurities() {
  await ready();
  return [...securities.entries()].map(([identifier, record]) => ({
    identifier,
    name: record.name,
    isin: record.isin,
  }));
}

export async function saveSecurity(input: { identifier: string; name: string; isin: string }) {
  await ready();
  const identifier = input.identifier.trim().toUpperCase();
  if (!identifier || !input.name.trim()) return null;
  const saved = { identifier, name: input.name.trim(), isin: input.isin.trim().toUpperCase() };
  securities.set(identifier, { name: saved.name, isin: saved.isin });
  await persistSecurity(identifier);
  return saved;
}

function legacyBank(profile: Pick<InvestorProfile, "fullName" | "bankName" | "accountNumber" | "ifsc">): BankAccount {
  return {
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
  };
}

export function withProfileCollections(portal: PortalData, patch: Partial<InvestorProfile> = {}) {
  const profile = portal.profile;
  const nominees: Nominee[] = profile.nominees?.length
    ? profile.nominees.map((nominee) => ({ ...nominee }))
    : profile.nomineeName
      ? [{ name: profile.nomineeName, relationship: profile.nomineeRelationship }]
      : [];
  const banks: BankAccount[] = profile.banks?.length
    ? profile.banks.map((bank) => ({ ...bank }))
    : profile.bankName || profile.accountNumber || profile.ifsc
      ? [legacyBank(profile)]
      : [];

  if (patch.nominees === undefined && (patch.nomineeName !== undefined || patch.nomineeRelationship !== undefined)) {
    const name = profile.nomineeName;
    const relationship = profile.nomineeRelationship;
    if (nominees.length === 0) nominees.push({ name, relationship });
    else nominees[0] = { name, relationship };
  }

  const bankTouched =
    patch.banks === undefined &&
    (patch.bankName !== undefined || patch.accountNumber !== undefined || patch.ifsc !== undefined);
  if (bankTouched) {
    const index = Math.max(banks.findIndex((bank) => bank.isPrimary), 0);
    const current = banks[index] ?? legacyBank(profile);
    banks[index] = {
      ...current,
      bankName: profile.bankName,
      accountNumber: profile.accountNumber,
      ifsccode: profile.ifsc,
      isPrimary: true,
    };
  }

  const first = nominees[0];
  const primary = banks.find((bank) => bank.isPrimary) ?? banks[0];
  return {
    ...portal,
    profile: {
      ...profile,
      nominees,
      nomineeName: first?.name ?? "",
      nomineeRelationship: first?.relationship ?? "",
      banks,
      bankName: primary?.bankName ?? "",
      accountNumber: primary?.accountNumber ?? "",
      ifsc: (primary?.ifsccode ?? "").toUpperCase(),
    },
  };
}

export function isProfileIncomplete(profile: PortalData["profile"]) {
  const nominees = profile.nominees ?? [];
  const primary = profile.banks?.find((bank) => bank.isPrimary) ?? profile.banks?.[0];
  return (
    !profile.pan.trim() ||
    !profile.mobile.trim() ||
    !profile.email.trim() ||
    (nominees.length === 0 && !profile.nomineeName.trim()) ||
    !(primary?.bankName || profile.bankName).trim() ||
    !(primary?.accountNumber || profile.accountNumber).trim() ||
    !(primary?.ifsccode || profile.ifsc).trim()
  );
}

function refreshMetrics(portal: PortalData) {
  const investedCapital = portal.ledger
    .filter(
      (row) =>
        row.type === "credit" &&
        row.narration.startsWith("Capital contribution"),
    )
    .reduce((sum, row) => sum + row.amount, 0);
  const currentValuation = portal.holdings.reduce(
    (sum, row) => sum + row.marketValue,
    0,
  );
  const unrealizedPnl = portal.holdings.reduce((sum, row) => sum + row.pnl, 0);
  portal.metrics = {
    ...portal.metrics,
    investedCapital,
    currentValuation,
    unrealizedPnl,
    totalPortfolioValue: currentValuation + portal.metrics.realizedPnl,
  };
}

async function latestNavValue() {
  const db = await getDb();
  const state = await db.collection("platform").findOne({ _id: "state" });
  const entries = (Array.isArray(state?.navEntries) ? state.navEntries : []) as Array<{
    date?: unknown;
    nav?: unknown;
    addedAt?: unknown;
  }>;
  const sorted = entries
    .map((entry) => ({
      date: String(entry.date ?? ""),
      nav: Number(entry.nav),
      addedAt: String(entry.addedAt ?? ""),
    }))
    .filter((entry) => Number.isFinite(entry.nav))
    .sort((left, right) => {
      const byDate = right.date.localeCompare(left.date);
      if (byDate !== 0) return byDate;
      return right.addedAt.localeCompare(left.addedAt);
    });
  return sorted[0]?.nav ?? null;
}

function presentPortal(portal: PortalData, nav: number | null): PortalData {
  if (nav == null) return portal;
  const holdings = portal.holdings.map((row) => {
    const marketValue = Math.round(row.quantity * nav * 100) / 100;
    return {
      ...row,
      marketValue,
      pnl: Math.round((marketValue - row.quantity * row.averageCost) * 100) / 100,
    };
  });
  const next: PortalData = { ...portal, holdings, metrics: { ...portal.metrics } };
  refreshMetrics(next);
  return next;
}

export async function currentNav() {
  await ready();
  return latestNavValue();
}

export async function listPortals() {
  await ready();
  const nav = await latestNavValue();
  return [...accounts.values()].map((account) => presentPortal(account.portal, nav));
}

export async function createClient(input: {
  fullName: string;
  fatherName: string;
  motherName: string;
  email: string;
  mobile: string;
  pan: string;
  dateOfBirth: string;
  address: string;
  tradingCode: string;
  nominees: Nominee[];
  bank: BankAccount;
  status: PortalData["profile"]["status"];
  kra: boolean;
  password: string;
}) {
  await ready();
  const email = input.email.trim().toLowerCase();
  const code = input.tradingCode.trim();
  if ([...accounts.values()].some((account) => account.portal.profile.email.toLowerCase() === email)) {
    return { error: "An investor with this email already exists." as const };
  }
  if (accounts.has(code)) {
    return { error: "An investor with this trading code already exists." as const };
  }
  const firstNominee = input.nominees[0];
  const portal = buildPortal({
    password: input.password,
    realizedPnl: 0,
    ledger: [],
    holdings: [],
    statements: [],
    profile: {
      tradingCode: code,
      fullName: input.fullName.trim(),
      dateOfBirth: input.dateOfBirth,
      pan: input.pan.trim().toUpperCase(),
      mobile: input.mobile.trim(),
      email,
      fatherName: input.fatherName.trim(),
      motherName: input.motherName.trim(),
      maritalStatus: "",
      annualIncome: "",
      address: input.address.trim(),
      nomineeName: firstNominee?.name ?? "",
      nomineeRelationship: firstNominee?.relationship ?? "",
      nominees: input.nominees.map((nominee) => ({
        name: nominee.name.trim(),
        relationship: nominee.relationship.trim(),
      })),
      kra: input.kra,
      fatca: false,
      status: input.status,
      bankName: input.bank.bankName.trim(),
      accountNumber: input.bank.accountNumber.trim(),
      ifsc: input.bank.ifsccode.trim().toUpperCase(),
      banks: [{ ...input.bank, ifsccode: input.bank.ifsccode.trim().toUpperCase(), isPrimary: true }],
    },
  });
  const salt = randomBytes(16).toString("base64url");
  accounts.set(code, {
    salt,
    hash: hashPassword(input.password, salt),
    version: 1,
    portal,
  });
  await persistInvestor(code);
  return { portal };
}

export async function updateClientProfile(
  clientCode: string,
  patch: Partial<PortalData["profile"]>,
) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return null;
  const merged = withProfileCollections(
    { ...account.portal, profile: { ...account.portal.profile, ...patch, tradingCode: clientCode } },
    patch,
  );
  account.portal.profile = merged.profile;
  await persistInvestor(clientCode);
  return account.portal;
}

export async function importLedgerRows(
  clientCode: string,
  rows: Array<{ date: string; type: "debit" | "credit"; amount: number; narration: string }>,
) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return false;
  let balance = account.portal.ledger.at(-1)?.balance ?? 0;
  rows.forEach((row, index) => {
    balance += row.type === "credit" ? row.amount : -row.amount;
    account.portal.ledger.push({
      id: `imp-${account.portal.ledger.length + 1}-${index}`,
      date: row.date,
      type: row.type,
      amount: row.amount,
      balance,
      narration: row.narration,
    });
  });
  refreshMetrics(account.portal);
  await persistInvestor(clientCode);
  return true;
}

export async function importHoldingRows(
  clientCode: string,
  rows: Array<{
    identifier: string;
    name: string;
    quantity: number;
    averageCost: number;
    marketValue: number;
  }>,
) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return false;
  rows.forEach((row) => {
    const identifier = row.identifier.toUpperCase();
    const existing = account.portal.holdings.find((item) => item.identifier === identifier);
    const next = {
      identifier,
      name: row.name,
      quantity: row.quantity,
      averageCost: row.averageCost,
      marketValue: row.marketValue,
      pnl: row.marketValue - row.quantity * row.averageCost,
    };
    if (existing) {
      Object.assign(existing, next);
    } else {
      account.portal.holdings.push({ id: identifier.toLowerCase(), ...next });
    }
  });
  refreshMetrics(account.portal);
  await persistInvestor(clientCode);
  return true;
}

export async function addGeneratedStatement(
  clientCode: string,
  statement: PortalData["statements"][number],
) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return false;
  account.portal.statements.unshift(statement);
  await persistInvestor(clientCode);
  return true;
}

export async function toSessionUser(clientCode: string) {
  const portal = await getPortal(clientCode);
  if (!portal) return null;
  return {
    name: portal.profile.fullName,
    email: portal.profile.email,
    mobile: portal.profile.mobile,
    clientCode: portal.profile.tradingCode,
  };
}
