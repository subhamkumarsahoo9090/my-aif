import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "./mongo.js";
import { identifierMatches } from "./identifier.js";
import { lotPnl, money, navAsOf, normalizeQuantity, planHoldingImport, type NavMark } from "./holding-pnl.js";
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
const holdingWrites = new Map<string, Promise<unknown>>();

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
        { $setOnInsert: { name: record.name, isin: record.isin, symbol: record.symbol } },
        { upsert: true },
      );
    }
  }

  accounts.clear();
  const cleaned: string[] = [];
  for (const doc of await investors.find().toArray()) {
    const code = String(doc._id);
    const portal = withProfileCollections(doc.portal as PortalData);
    if (dropHoldingSrNo(portal)) cleaned.push(code);
    accounts.set(code, {
      salt: String(doc.salt),
      hash: Buffer.from(String(doc.hash), "base64"),
      version: Number(doc.version),
      portal,
    });
  }
  for (const code of cleaned) await persistInvestor(code);

  securities.clear();
  type SecurityDoc = { _id?: unknown; name?: unknown; isin?: unknown; symbol?: unknown };
  const securityDocs = (await securityCol.find().toArray()) as SecurityDoc[];
  const byIsin = new Map<string, SecurityDoc[]>();
  const loose: SecurityDoc[] = [];
  for (const doc of securityDocs) {
    const isin = String(doc.isin ?? "").trim().toUpperCase();
    if (/^[A-Z0-9]{12}$/.test(isin)) {
      const list = byIsin.get(isin) ?? [];
      list.push(doc);
      byIsin.set(isin, list);
    } else {
      loose.push(doc);
    }
  }
  for (const [isin, list] of byIsin) {
    const preferred = list.find((doc) => String(doc._id).toUpperCase() === isin) ?? list[0];
    securities.set(isin, {
      name: String(preferred.name),
      isin,
      symbol: String(preferred.symbol || defaultSecuritySymbol),
    });
    for (const doc of list) {
      if (String(doc._id).toUpperCase() !== isin) await securityCol.deleteOne({ _id: doc._id });
    }
    if (String(preferred._id).toUpperCase() !== isin) {
      await securityCol.deleteOne({ _id: preferred._id });
      await persistSecurity(isin);
    }
  }
  for (const doc of loose) {
    const id = String(doc._id).toUpperCase();
    if (securities.has(id)) {
      await securityCol.deleteOne({ _id: doc._id });
      continue;
    }
    securities.set(id, {
      name: String(doc.name),
      isin: String(doc.isin ?? ""),
      symbol: String(doc.symbol || defaultSecuritySymbol),
    });
  }
}

function dropHoldingSrNo(portal: PortalData) {
  const holdings = portal.holdings ?? [];
  if (!holdings.some((holding) => "srNo" in holding)) return false;
  portal.holdings = portal.holdings.map((holding) => {
    const next = { ...holding };
    delete (next as { srNo?: string }).srNo;
    return next;
  });
  return true;
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
    { _id: identifier, name: record.name, isin: record.isin, symbol: record.symbol },
    { upsert: true },
  );
}

export async function removeSecurity(identifier: string) {
  await ready();
  const key = identifier.trim().toUpperCase();
  if (!securities.has(key)) return false;
  securities.delete(key);
  const db = await getDb();
  await db.collection("securities").deleteOne({ _id: key });
  return true;
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
  return presentPortal(portal, await navMarks());
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

type SecurityRecord = { name: string; isin: string; symbol: string };

export const defaultSecuritySymbol = "WEALTH DISCOVERY INVESTMENT TRUST";

const defaultSecurities: Array<[string, SecurityRecord]> = [
  ["TGF-I-A", { name: "Techculture Growth Fund I - Class A", isin: "INF204K01AIF", symbol: defaultSecuritySymbol }],
  ["IOF-II-B", { name: "Income Opportunities Fund II - Class B", isin: "INF204K01IOF", symbol: defaultSecuritySymbol }],
];

const securities = new Map<string, SecurityRecord>();

export async function knownSecurity(identifier: string) {
  await ready();
  return securities.get(identifier.trim().toUpperCase())?.name ?? null;
}

export async function listSecurities() {
  await ready();
  const seen = new Set<string>();
  const rows = [];
  for (const [identifier, record] of securities) {
    const isin = (record.isin || identifier).trim().toUpperCase();
    if (seen.has(isin)) continue;
    seen.add(isin);
    rows.push({
      identifier: /^[A-Z0-9]{12}$/.test(isin) ? isin : identifier,
      name: record.name,
      isin,
      symbol: record.symbol || defaultSecuritySymbol,
    });
  }
  return rows;
}

export async function saveSecurity(input: { identifier: string; name: string; isin: string; symbol?: string }) {
  await ready();
  const isin = input.isin.trim().toUpperCase();
  const given = input.identifier.trim().toUpperCase();
  const identifier = /^[A-Z0-9]{12}$/.test(isin) ? isin : given;
  if (!identifier || !input.name.trim()) return null;
  if (given && given !== identifier) {
    securities.delete(given);
    const db = await getDb();
    await db.collection("securities").deleteOne({ _id: given });
  }
  const saved = {
    identifier,
    name: input.name.trim(),
    isin: isin || identifier,
    symbol: input.symbol?.trim() || defaultSecuritySymbol,
  };
  securities.set(identifier, { name: saved.name, isin: saved.isin, symbol: saved.symbol });
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
      occupation: profile.occupation ?? "",
      maritalStatus: profile.maritalStatus ?? "",
      annualIncome: profile.annualIncome ?? "",
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
        (row.narration.startsWith("Capital contribution") || Boolean(row.particulars || row.vchType)),
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

async function navMarks(): Promise<NavMark[]> {
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
    .filter((entry) => entry.date && Number.isFinite(entry.nav))
    .sort((left, right) => {
      const byDate = right.date.localeCompare(left.date);
      if (byDate !== 0) return byDate;
      return right.addedAt.localeCompare(left.addedAt);
    });
  const byDate = new Map<string, NavMark>();
  sorted.forEach((entry) => {
    if (!byDate.has(entry.date)) byDate.set(entry.date, { date: entry.date, nav: entry.nav });
  });
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function latestNavValue() {
  const points = await navMarks();
  return navAsOf(points, todayIso());
}

function presentPortal(portal: PortalData, points: NavMark[]): PortalData {
  const asOf = todayIso();
  const current = navAsOf(points, asOf);
  if (current == null) return portal;
  const priced = portal.holdings.map((row) => {
    const saved = row.costNav ?? (row.allotmentDate ? navAsOf(points, row.allotmentDate) ?? undefined : undefined);
    const costNav = saved ?? (row.averageCost > 0 ? row.averageCost : undefined);
    return { ...row, ...(costNav == null ? {} : { costNav }) };
  });
  const holdings = priced.map((row) => {
    const marketValue = money(row.quantity * current);
    return { ...row, marketValue, pnl: lotPnl(row, current, asOf) };
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
  const points = await navMarks();
  return [...accounts.values()].map((account) => presentPortal(account.portal, points));
}

export async function createClient(input: {
  fullName: string;
  fatherName: string;
  motherName: string;
  occupation: string;
  maritalStatus: string;
  annualIncome: string;
  email: string;
  mobile: string;
  pan: string;
  dateOfBirth: string;
  address: string;
  tradingCode: string;
  dpClientId?: string;
  dpName?: string;
  ckycNo?: string;
  nominees: Nominee[];
  bank: BankAccount;
  status: PortalData["profile"]["status"];
  kra: boolean;
  fatca?: boolean;
  password: string;
}) {
  await ready();
  const email = input.email.trim().toLowerCase();
  const code = input.tradingCode.trim();
  if ([...accounts.values()].some((account) => account.portal.profile.email.toLowerCase() === email)) {
    return { error: "An investor with this email already exists." as const };
  }
  if (accounts.has(code)) {
    return { error: "An investor with this AIF code already exists." as const };
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
      occupation: input.occupation.trim(),
      maritalStatus: input.maritalStatus.trim(),
      annualIncome: input.annualIncome.trim(),
      address: input.address.trim(),
      dpClientId: input.dpClientId?.trim() ?? "",
      dpName: input.dpName?.trim() ?? "",
      ckycNo: input.ckycNo?.trim() ?? "",
      nomineeName: firstNominee?.name ?? "",
      nomineeRelationship: firstNominee?.relationship ?? "",
      nominees: input.nominees.map((nominee) => ({
        name: nominee.name.trim(),
        relationship: nominee.relationship.trim(),
        dateOfBirth: nominee.dateOfBirth?.trim() ?? "",
        mobile: nominee.mobile?.trim() ?? "",
        email: nominee.email?.trim() ?? "",
        pan: nominee.pan?.trim().toUpperCase() ?? "",
        address: nominee.address?.trim() ?? "",
        share: nominee.share?.trim() ?? "",
      })),
      kra: input.kra,
      fatca: input.fatca === true,
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

export async function pendingKraClients() {
  await ready();
  return [...accounts.values()].flatMap((account) => {
    const profile = account.portal.profile;
    if ((profile.kra && profile.fatca) || !profile.pan.trim() || !profile.dateOfBirth.trim()) return [];
    return [{ code: profile.tradingCode, pan: profile.pan, dob: profile.dateOfBirth }];
  });
}

export async function setInvestorKra(clientCode: string, kra: boolean, fatca = false) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return false;
  let changed = false;
  if (kra && !account.portal.profile.kra) {
    account.portal.profile.kra = true;
    changed = true;
  }
  if (fatca && !account.portal.profile.fatca) {
    account.portal.profile.fatca = true;
    changed = true;
  }
  if (!changed) return false;
  await persistInvestor(clientCode);
  return true;
}

export async function importLedgerRows(
  clientCode: string,
  rows: Array<{
    date: string;
    type: "debit" | "credit";
    amount: number;
    narration: string;
    particulars?: string;
    vchType?: string;
    vchNo?: string;
  }>,
  mode: "append" | "replace" = "append",
) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return false;
  let balance = mode === "replace" ? 0 : (account.portal.ledger.at(-1)?.balance ?? 0);
  const next = rows.map((row, index) => {
    balance += row.type === "credit" ? row.amount : -row.amount;
    return {
      id: `imp-${mode === "replace" ? index + 1 : account.portal.ledger.length + 1}-${index}`,
      date: row.date,
      type: row.type,
      amount: row.amount,
      balance,
      narration: row.narration,
      particulars: row.particulars || "",
      vchType: row.vchType || "",
      vchNo: row.vchNo || "",
    };
  });
  if (mode === "replace") account.portal.ledger = next;
  else account.portal.ledger.push(...next);
  refreshMetrics(account.portal);
  await persistInvestor(clientCode);
  return true;
}

function rebalanceLedger(portal: PortalData) {
  let balance = 0;
  portal.ledger = portal.ledger.map((row) => {
    balance = Math.round((balance + (row.type === "credit" ? row.amount : -row.amount)) * 100) / 100;
    return { ...row, balance };
  });
  refreshMetrics(portal);
}

export async function listLedgerRows() {
  await ready();
  const rows = [];
  for (const account of accounts.values()) {
    const profile = account.portal.profile;
    for (const row of account.portal.ledger) {
      rows.push({
        id: row.id,
        clientCode: profile.tradingCode,
        clientName: profile.fullName,
        date: row.date,
        type: row.type,
        amount: row.amount,
        balance: row.balance,
        particulars: row.particulars?.trim() || row.narration,
        vchType: row.vchType ?? "",
        vchNo: row.vchNo ?? "",
      });
    }
  }
  return rows;
}

export async function updateLedgerRow(input: {
  clientCode: string;
  ledgerId: string;
  nextClientCode: string;
  date: string;
  type: "debit" | "credit";
  amount: number;
  particulars: string;
  vchType: string;
  vchNo: string;
}) {
  await ready();
  const source = accounts.get(input.clientCode);
  if (!source) return { error: "Client not found." as const };
  const index = source.portal.ledger.findIndex((row) => row.id === input.ledgerId);
  if (index < 0) return { error: "Ledger row not found." as const };
  const target = accounts.get(input.nextClientCode);
  if (!target) return { error: "Client not found." as const };
  const current = source.portal.ledger[index];
  const particulars = input.particulars.trim();
  const next = {
    ...current,
    date: input.date,
    type: input.type,
    amount: Math.round(input.amount * 100) / 100,
    narration: particulars,
    particulars,
    vchType: input.vchType.trim(),
    vchNo: input.vchNo.trim(),
  };
  if (target === source) {
    source.portal.ledger[index] = next;
    rebalanceLedger(source.portal);
    await persistInvestor(input.clientCode);
    return { row: next };
  }
  source.portal.ledger.splice(index, 1);
  rebalanceLedger(source.portal);
  const id = target.portal.ledger.some((row) => row.id === next.id) ? `led-${Date.now()}` : next.id;
  const moved = { ...next, id };
  target.portal.ledger.push(moved);
  rebalanceLedger(target.portal);
  await persistInvestor(input.clientCode);
  await persistInvestor(input.nextClientCode);
  return { row: moved };
}

export async function removeLedgerRow(clientCode: string, ledgerId: string) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return null;
  const current = account.portal.ledger.find((row) => row.id === ledgerId);
  if (!current) return null;
  account.portal.ledger = account.portal.ledger.filter((row) => row !== current);
  rebalanceLedger(account.portal);
  await persistInvestor(clientCode);
  return current;
}

function holdingKey(identifier: string, allotmentDate: string, pan: string) {
  const code = identifier.toUpperCase();
  const date = allotmentDate.trim();
  const panKey = pan.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return date ? `${code}-${date}-${panKey}`.toLowerCase() : code.toLowerCase();
}

export async function listHoldingRows() {
  await ready();
  const rows = [];
  for (const account of accounts.values()) {
    const profile = account.portal.profile;
    for (const holding of account.portal.holdings) {
      rows.push({
        id: holding.id,
        clientCode: profile.tradingCode,
        clientName: profile.fullName,
        identifier: holding.identifier,
        name: holding.name,
        quantity: holding.quantity,
        allotmentDate: holding.allotmentDate ?? "",
        allotteeName: holding.allotteeName ?? "",
        pan: holding.pan ?? "",
      });
    }
  }
  return rows;
}

export async function updateHoldingRow(input: {
  clientCode: string;
  holdingId: string;
  nextClientCode: string;
  identifier: string;
  name: string;
  quantity: number;
  allotmentDate: string;
  allotteeName: string;
  pan: string;
}) {
  await ready();
  const source = accounts.get(input.clientCode);
  if (!source) return { error: "Client not found." as const };
  const current = source.portal.holdings.find((item) => item.id === input.holdingId);
  if (!current) return { error: "Holding not found." as const };
  const target = accounts.get(input.nextClientCode);
  if (!target) return { error: "Client not found." as const };
  const identifier = input.identifier.trim().toUpperCase();
  const allotmentDate = input.allotmentDate.trim();
  const pan = input.pan.trim().toUpperCase();
  const id = holdingKey(identifier, allotmentDate, pan);
  const clash = target.portal.holdings.some((item) => item.id === id && item !== current);
  if (clash) return { error: "This client already has that allotment." as const };
  const next = {
    id,
    identifier,
    name: input.name.trim(),
    quantity: input.quantity,
    averageCost: current.averageCost,
    marketValue: current.marketValue,
    pnl: current.marketValue - input.quantity * current.averageCost,
    ...(current.costNav != null ? { costNav: current.costNav } : {}),
    ...(allotmentDate ? { allotmentDate } : {}),
    ...(input.allotteeName.trim() ? { allotteeName: input.allotteeName.trim() } : {}),
    ...(pan ? { pan } : {}),
  };
  source.portal.holdings = source.portal.holdings.filter((item) => item !== current);
  refreshMetrics(source.portal);
  target.portal.holdings.push(next);
  refreshMetrics(target.portal);
  await persistInvestor(input.clientCode);
  if (input.nextClientCode !== input.clientCode) await persistInvestor(input.nextClientCode);
  return { holding: next };
}

export async function updateHoldingNav(clientCode: string, holdingId: string, nav: number) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return { error: "Client not found." as const };
  const current = account.portal.holdings.find((item) => item.id === holdingId);
  if (!current) return { error: "Holding not found." as const };
  if (!Number.isFinite(nav) || nav <= 0) return { error: "Enter a NAV greater than zero." as const };
  const costNav = Math.round(nav * 10000) / 10000;
  current.costNav = costNav;
  current.averageCost = costNav;
  refreshMetrics(account.portal);
  await persistInvestor(clientCode);
  return { holding: current };
}

export async function removeHoldingRow(clientCode: string, holdingId: string) {
  await ready();
  const account = accounts.get(clientCode);
  if (!account) return null;
  const current = account.portal.holdings.find((item) => item.id === holdingId);
  if (!current) return null;
  account.portal.holdings = account.portal.holdings.filter((item) => item !== current);
  refreshMetrics(account.portal);
  await persistInvestor(clientCode);
  return current;
}

function writeHoldings<T>(clientCode: string, task: () => Promise<T>) {
  const previous = holdingWrites.get(clientCode) ?? Promise.resolve();
  const run = previous.then(task, task);
  holdingWrites.set(clientCode, run.then(() => undefined, () => undefined));
  return run;
}

export async function importHoldingRows(
  clientCode: string,
  rows: Array<{
    identifier: string;
    name: string;
    quantity: number;
    averageCost: number;
    marketValue: number;
    allotmentDate?: string;
    allotteeName?: string;
    pan?: string;
  }>,
) {
  await ready();
  return writeHoldings(clientCode, async () => {
    const account = accounts.get(clientCode);
    if (!account) return { inserted: 0, skipped: 0, failed: [{ reason: "Client not found." }] };
    const nav = await latestNavValue();
    const plan = planHoldingImport(account.portal.holdings, rows, nav);
    let inserted = 0;
    let skipped = 0;
    const failed: Array<{ reason: string }> = [];
    rows.forEach((row, index) => {
      const decision = plan[index];
      const allotmentDate = row.allotmentDate?.trim() ?? "";
      const pan = row.pan?.trim().toUpperCase() ?? "";
      if (decision.status === "skip") {
        skipped += 1;
        return;
      }
      if (!allotmentDate || !pan) {
        const identifier = row.identifier.toUpperCase();
        const id = holdingKey(identifier, allotmentDate, pan);
        if (account.portal.holdings.some((item) => item.id === id)) {
          skipped += 1;
          return;
        }
      }
      if (decision.status === "fail") {
        failed.push({ reason: decision.reason ?? "The holding could not be saved." });
        return;
      }
      const identifier = row.identifier.toUpperCase();
      const id = allotmentDate
        ? `${holdingKey(identifier, allotmentDate, pan)}-${normalizeQuantity(row.quantity)}`
        : holdingKey(identifier, allotmentDate, pan);
      if (account.portal.holdings.some((item) => item.id === id)) {
        skipped += 1;
        return;
      }
      account.portal.holdings.push({
        id,
        identifier,
        name: row.name,
        quantity: row.quantity,
        averageCost: decision.costNav ?? row.averageCost,
        marketValue: money(row.quantity * (decision.costNav ?? nav ?? 0)),
        pnl: 0,
        costNav: decision.costNav,
        ...(allotmentDate ? { allotmentDate } : {}),
        ...(row.allotteeName ? { allotteeName: row.allotteeName } : {}),
        ...(pan ? { pan } : {}),
      });
      inserted += 1;
    });
    if (inserted > 0) {
      refreshMetrics(account.portal);
      await persistInvestor(clientCode);
    }
    return { inserted, skipped, failed };
  });
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
