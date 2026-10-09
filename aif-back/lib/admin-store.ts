import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb } from "./mongo.js";
import {
  addGeneratedStatement,
  getPortal,
  importHoldingRows,
  importLedgerRows,
  isProfileIncomplete,
  knownSecurity,
  listPortals,
  listSecurities,
  saveSecurity,
  createClient,
  ready,
  removeInvestor,
  updateClientProfile,
} from "./portal-store.js";
import type { AdminRole, AdminUser, ClientStatus, PortalData } from "./types.js";
import { investorMatchScore, parseLedgerStatement } from "./ledger-statement.js";

export type { AdminRole, AdminUser };

type StaffStatus = "active" | "suspended";

type StaffAccount = AdminUser & {
  salt: string;
  hash: Buffer;
  version: number;
  status: StaffStatus;
};

export type ImportKind = "ledger" | "holdings";

export type ImportJob = {
  id: string;
  type: ImportKind;
  fileName: string;
  status: "committed" | "failed";
  valid: number;
  failed: number;
  at: string;
  actor: string;
  clientCode?: string;
  clientName?: string;
};

export type StatementRun = {
  id: string;
  clientCode: string;
  clientName: string;
  statementType: string;
  period: string;
  mode: "manual" | "scheduled";
  frequency: string;
  status: "generated" | "sent" | "scheduled";
  at: string;
  actor: string;
  statementId?: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  userId: string;
  action: string;
  targetEntity: string;
  entityId: string;
  detail: string;
  clientCode: string;
};

export type ImportRow = {
  line: number;
  ok: boolean;
  errors: string[];
  values: Record<string, string>;
};

const staff = new Map<string, StaffAccount>();
const imports: ImportJob[] = [
  {
    id: "imp-seed-1",
    type: "ledger",
    fileName: "ledger-jun-2026.csv",
    status: "committed",
    valid: 4,
    failed: 1,
    at: "2026-06-30T10:15:00.000Z",
    actor: "Rohan Iyer",
  },
];
const runs: StatementRun[] = [
  {
    id: "run-seed-1",
    clientCode: "TC24018",
    clientName: "Subham",
    statementType: "Capital account",
    period: "Q1 FY 2026-27",
    mode: "scheduled",
    frequency: "monthly",
    status: "sent",
    at: "2026-07-15T09:00:00.000Z",
    actor: "System",
  },
];
const audit: AuditEntry[] = [
  {
    id: "aud-seed-1",
    at: "2026-06-30T10:15:00.000Z",
    actor: "Rohan Iyer",
    userId: "staff-ops",
    action: "Import committed",
    targetEntity: "import",
    entityId: "imp-seed-1",
    detail: "Ledger file ledger-jun-2026.csv",
    clientCode: "",
  },
];
const sessions: Array<{ staffId: string; name: string; role: AdminRole; at: string }> = [];
const modules = [
  "clients",
  "imports",
  "reports",
  "nav",
  "users",
  "audit",
  "schedules",
  "platform",
  "ledger",
] as const;
const roleAccess: Record<AdminRole, Record<(typeof modules)[number], boolean>> = {
  superadmin: {
    clients: true,
    imports: true,
    reports: true,
    nav: true,
    users: true,
    audit: true,
    schedules: true,
    platform: true,
    ledger: true,
  },
  admin: {
    clients: true,
    imports: true,
    reports: true,
    nav: true,
    users: false,
    audit: false,
    schedules: false,
    platform: false,
    ledger: false,
  },
};
type NavEntry = {
  id: string;
  date: string;
  nav: number;
  addedBy: string;
  addedAt: string;
};

const navEntries: NavEntry[] = [];
const navPageSize = 8;

const kraSettings = {
  endpoint: "https://kra.example/verify",
  token: "kra-demo-token",
  timeoutSeconds: 30,
};
const scheduleRules: Array<{
  id: string;
  frequency: "daily" | "weekly" | "monthly";
  target: string;
  retries: number;
  preventDuplicates: boolean;
}> = [
  {
    id: "sch-1",
    frequency: "monthly",
    target: "all-active",
    retries: 2,
    preventDuplicates: true,
  },
];

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 32);
}

function seedStaff(user: AdminUser, password: string) {
  const salt = randomBytes(16).toString("base64url");
  staff.set(user.id, {
    ...user,
    salt,
    hash: hashPassword(password, salt),
    version: 1,
    status: "active",
  });
}

const defaultStaff = [
  {
    user: {
      id: "staff-super",
      name: "Super admin",
      email: "superadmin@gmail.com",
      role: "superadmin" as const,
    },
    password: "123456",
  },
];

export const demoAdmins = [
  { email: "superadmin@gmail.com", password: "123456", role: "Super admin" },
];

function passwordsMatch(password: string, salt: string, hash: Buffer) {
  const actual = hashPassword(password, salt);
  return actual.length === hash.length && timingSafeEqual(actual, hash);
}

let adminReady: Promise<void> | null = null;

export function ensureAdmin() {
  if (!adminReady) {
    adminReady = hydrateAdmin().catch((error) => {
      adminReady = null;
      throw error;
    });
  }
  return adminReady;
}

async function persistStaff(id: string) {
  const account = staff.get(id);
  if (!account) return;
  const db = await getDb();
  await db.collection("staff").replaceOne(
    { _id: id },
    {
      _id: id,
      name: account.name,
      email: account.email,
      role: account.role,
      salt: account.salt,
      hash: account.hash.toString("base64"),
      version: account.version,
      status: account.status,
    },
    { upsert: true },
  );
}

async function persistPlatform() {
  const db = await getDb();
  await db.collection("platform").replaceOne(
    { _id: "state" },
    {
      _id: "state",
      imports,
      runs,
      audit,
      sessions,
      roleAccess,
      kra: { ...kraSettings },
      schedules: scheduleRules,
      navEntries,
    },
    { upsert: true },
  );
}

async function replaceSuperadmin(staffCol: {
  deleteMany: (filter: Record<string, unknown>) => Promise<unknown>;
  findOne: (filter: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  deleteOne: (filter: Record<string, unknown>) => Promise<unknown>;
}) {
  const account = defaultStaff[0];
  await staffCol.deleteMany({
    role: "superadmin",
    email: { $ne: account.user.email },
  });
  const existing = await staffCol.findOne({ email: account.user.email });
  const sameAccount = existing && String(existing._id) === account.user.id;
  const samePassword =
    sameAccount &&
    passwordsMatch(account.password, String(existing.salt), Buffer.from(String(existing.hash), "base64"));
  if (samePassword) return;
  if (existing) await staffCol.deleteOne({ _id: existing._id });
  seedStaff(account.user, account.password);
  await persistStaff(account.user.id);
}

async function hydrateAdmin() {
  await ready();
  const db = await getDb();
  const staffCol = db.collection("staff");
  if ((await staffCol.countDocuments()) === 0) {
    for (const entry of defaultStaff) {
      seedStaff(entry.user, entry.password);
      await persistStaff(entry.user.id);
    }
  } else {
    await replaceSuperadmin(staffCol);
  }

  staff.clear();
  for (const doc of await staffCol.find().toArray()) {
    staff.set(String(doc._id), {
      id: String(doc._id),
      name: String(doc.name),
      email: String(doc.email),
      role: doc.role === "superadmin" ? "superadmin" : "admin",
      salt: String(doc.salt),
      hash: Buffer.from(String(doc.hash), "base64"),
      version: Number(doc.version),
      status: doc.status === "suspended" ? "suspended" : "active",
    });
  }

  const platformCol = db.collection("platform");
  const state = await platformCol.findOne({ _id: "state" });
  if (!state) {
    await persistPlatform();
    return;
  }

  imports.splice(0, imports.length, ...((state.imports as ImportJob[]) ?? []));
  runs.splice(0, runs.length, ...((state.runs as StatementRun[]) ?? []));
  audit.splice(0, audit.length, ...((state.audit as AuditEntry[]) ?? []));
  sessions.splice(0, sessions.length, ...((state.sessions as typeof sessions) ?? []));
  scheduleRules.splice(0, scheduleRules.length, ...((state.schedules as typeof scheduleRules) ?? []));
  navEntries.splice(0, navEntries.length, ...((state.navEntries as NavEntry[]) ?? []).map((entry) => ({
    id: String(entry.id),
    date: String(entry.date),
    nav: Number(entry.nav),
    addedBy: String(entry.addedBy ?? ""),
    addedAt: String(entry.addedAt ?? ""),
  })));
  if (state.kra && typeof state.kra === "object") {
    Object.assign(kraSettings, state.kra);
  }
  const savedAccess = state.roleAccess as typeof roleAccess | undefined;
  if (savedAccess?.admin) Object.assign(roleAccess.admin, savedAccess.admin);
  if (savedAccess?.superadmin) Object.assign(roleAccess.superadmin, savedAccess.superadmin);
}

export async function authenticateStaff(email: string, password: string) {
  await ensureAdmin();
  const normalized = email.trim().toLowerCase();
  const account = [...staff.values()].find((item) => item.email === normalized);
  if (!account || !passwordsMatch(password, account.salt, account.hash)) return null;
  if (account.status === "suspended") return "suspended" as const;
  return account;
}

export async function getStaff(id: string) {
  await ensureAdmin();
  return staff.get(id) ?? null;
}

export async function staffVersion(id: string) {
  await ensureAdmin();
  return staff.get(id)?.version ?? null;
}

export async function toAdminUser(id: string): Promise<AdminUser | null> {
  await ensureAdmin();
  const account = staff.get(id);
  if (!account) return null;
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
  };
}

function stamp() {
  return new Date().toISOString();
}

export async function recordAudit(entry: {
  actor: string;
  action: string;
  detail: string;
  clientCode?: string;
  userId?: string;
  targetEntity?: string;
  entityId?: string;
  at?: string;
}) {
  audit.unshift({
    id: `aud-${audit.length + 1}`,
    at: entry.at ?? stamp(),
    actor: entry.actor,
    userId: entry.userId ?? "",
    action: entry.action,
    targetEntity: entry.targetEntity ?? "system",
    entityId: entry.entityId ?? entry.clientCode ?? "",
    detail: entry.detail,
    clientCode: entry.clientCode ?? "",
  });
  await persistPlatform();
}

export async function noteStaffLogin(account: StaffAccount) {
  await ensureAdmin();
  sessions.unshift({
    staffId: account.id,
    name: account.name,
    role: account.role,
    at: stamp(),
  });
  sessions.splice(12);
  await recordAudit({
    actor: account.name,
    userId: account.id,
    action: "Staff login",
    targetEntity: "staff",
    entityId: account.id,
    detail: account.email,
  });
}

export async function adminOverview() {
  await ensureAdmin();
  const portals = await listPortals();
  const active = portals.filter((item) => item.profile.status === "active").length;
  const pendingKra = portals.filter((item) => item.profile.status === "active" && !item.profile.kra).length;
  const incomplete = portals.filter((item) => isProfileIncomplete(item.profile)).length;
  const aum = portals.reduce((sum, item) => sum + item.metrics.totalPortfolioValue, 0);
  return {
    active,
    inactive: portals.length - active,
    pendingKra,
    incomplete,
    aum,
    imports: imports.slice(0, 5),
    runs: runs.slice(0, 5),
  };
}

export async function clientRows() {
  await ensureAdmin();
  return (await listPortals()).map((portal) => ({
    code: portal.profile.tradingCode,
    name: portal.profile.fullName,
    mobile: portal.profile.mobile,
    email: portal.profile.email,
    status: portal.profile.status,
    kra: portal.profile.kra,
    incomplete: isProfileIncomplete(portal.profile),
    aum: portal.metrics.totalPortfolioValue,
  }));
}

export async function clientRecord(code: string) {
  await ensureAdmin();
  const portal = await getPortal(code);
  if (!portal) return null;
  return {
    portal,
    incomplete: isProfileIncomplete(portal.profile),
    documents: [
      {
        name: "PAN",
        status: portal.profile.pan ? "On file" : "Missing",
      },
      {
        name: "KRA",
        status: portal.profile.kra ? "Verified" : "Pending",
      },
      {
        name: "Bank proof",
        status: portal.profile.accountNumber ? "On file" : "Missing",
      },
      ...portal.statements.map((statement) => ({
        name: statement.fileName,
        status: "Issued",
      })),
    ],
    audit: audit.filter((entry) => entry.clientCode === code),
  };
}

export async function saveClient(
  actor: string,
  input: {
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
    nominees: PortalData["profile"]["nominees"];
    bank: PortalData["profile"]["banks"][number];
    status: ClientStatus;
    kra: boolean;
  },
) {
  const created = await createClient({ ...input, password: "123456" });
  if ("error" in created) return created;
  await recordAudit({
    actor,
    action: "Client created",
    detail: created.portal.profile.fullName,
    clientCode: created.portal.profile.tradingCode,
  });
  return { code: created.portal.profile.tradingCode };
}

export async function editClient(
  actor: string,
  code: string,
  patch: Partial<PortalData["profile"]>,
) {
  const clean = Object.fromEntries(
    Object.entries(patch).filter((entry) => entry[1] !== undefined),
  ) as Partial<PortalData["profile"]>;
  const portal = await updateClientProfile(code, clean);
  if (!portal) return null;
  await recordAudit({
    actor,
    action: "Client updated",
    detail: portal.profile.fullName,
    clientCode: code,
  });
  return portal;
}

function cell(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value) return value;
  }
  return "";
}

function parseCsv(text: string) {
  const table = splitCsv(text);
  if (table.length === 0) return [];
  const headers = table[0].cells.map((header) => header.trim().toLowerCase().replace(/\s+/g, " "));
  return table.slice(1).flatMap((row) => {
    const values: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      values[header] = (row.cells[index] ?? "").trim();
    });
    if (!Object.values(values).some((value) => value)) return [];
    return [{ line: row.line, values }];
  });
}

function splitCsv(text: string) {
  const rows: Array<{ line: number; cells: string[] }> = [];
  let cells: string[] = [];
  let value = "";
  let quoted = false;
  let line = 1;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        if (char === "\n") line += 1;
        value += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      cells.push(value);
      value = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      cells.push(value);
      if (cells.some((item) => item.trim())) rows.push({ line, cells });
      cells = [];
      value = "";
      line += 1;
      continue;
    }
    value += char;
  }
  if (value.length > 0 || cells.length > 0) {
    cells.push(value);
    if (cells.some((item) => item.trim())) rows.push({ line, cells });
  }
  return rows;
}

function isAllotmentSheet(values: Record<string, string>) {
  const keys = new Set(Object.keys(values));
  const hasPan = keys.has("pan number") || keys.has("pan");
  const hasUnits = keys.has("number of units") || keys.has("units") || keys.has("isin number") || keys.has("isin");
  return hasPan && hasUnits;
}

function allotmentIso(value: string) {
  const match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(value.trim());
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function panTokens(value: string) {
  return value.toUpperCase().match(/[A-Z]{5}[0-9]{4}[A-Z]/g) ?? [];
}

async function statementClientCode(headerLines: string[], chosenCode: string) {
  const portals = await listPortals();
  let best = { code: "", name: "", score: 0 };
  for (const portal of portals) {
    for (const line of headerLines) {
      const score = investorMatchScore(portal.profile.fullName, line);
      if (score > best.score) best = { code: portal.profile.tradingCode, name: portal.profile.fullName, score };
    }
  }
  const named = best.score >= 65 ? best : null;
  const chosen = chosenCode.trim();
  if (chosen) {
    const selected = await getPortal(chosen);
    if (!selected) return { code: "", error: "Choose a client that exists." };
    if (named && named.code !== chosen) {
      return {
        code: "",
        error: `This file is for ${named.name} (${named.code}). Leave the client blank, or choose that client.`,
      };
    }
    return { code: chosen, error: "" };
  }
  if (named) return { code: named.code, error: "" };
  return { code: "", error: "The investor name in the file does not match a client. Choose the client and check the file again." };
}

export async function previewImport(type: ImportKind, csv: string, clientCode = ""): Promise<ImportRow[]> {
  await ensureAdmin();
  if (type === "ledger") {
    const statement = parseLedgerStatement(csv);
    if (!statement) {
      return [{
        line: 1,
        ok: false,
        errors: ["This file could not be read. Upload an Excel or PDF ledger with Date, Particulars, Debit, and Credit."],
        values: {},
      }];
    }
    return previewLedgerStatement(statement, clientCode);
  }
  const parsed = parseCsv(csv);
  if (parsed.length === 0) {
    return [{ line: 1, ok: false, errors: ["No holding rows were found."], values: {} }];
  }
  if (isAllotmentSheet(parsed[0].values)) return previewAllotmentRows(parsed);
  const rows: ImportRow[] = [];
  for (const row of parsed) {
    const errors: string[] = [];
    const values = row.values;
    const code = cell(values, "clientcode", "client_code", "code");
    if (!(await getPortal(code))) errors.push("Unknown client code.");
    const identifier = cell(values, "identifier", "security").toUpperCase();
    if (!(await knownSecurity(identifier))) errors.push("Security is not in the fund list.");
    const quantity = Number(cell(values, "quantity"));
    const averageCost = Number(cell(values, "averagecost", "average_cost"));
    const marketValue = Number(cell(values, "marketvalue", "market_value"));
    if (!Number.isFinite(quantity) || quantity <= 0) errors.push("Quantity must be greater than zero.");
    if (!Number.isFinite(averageCost) || averageCost < 0) errors.push("Average cost is invalid.");
    if (!Number.isFinite(marketValue) || marketValue < 0) errors.push("Market value is invalid.");
    rows.push({ line: row.line, ok: errors.length === 0, errors, values });
  }
  return rows;
}

async function previewAllotmentRows(parsed: Array<{ line: number; values: Record<string, string> }>) {
  const portals = await listPortals();
  const byPan = new Map<string, { code: string; name: string }>();
  portals.forEach((portal) => {
    panTokens(portal.profile.pan).forEach((token) => {
      if (!byPan.has(token)) byPan.set(token, { code: portal.profile.tradingCode, name: portal.profile.fullName });
    });
  });
  return parsed.map((row) => {
    const source = row.values;
    const errors: string[] = [];
    const srNo = cell(source, "sr. no.", "sr no.", "sr no", "sr. no", "s.no", "s. no.", "serial no");
    const isin = cell(source, "isin number", "isin", "isinnumber").toUpperCase();
    const description = cell(source, "isin description", "description", "isindescription");
    const allottee = cell(source, "name of allottee", "allottee", "allottee name");
    const pan = cell(source, "pan number", "pan", "pannumber").toUpperCase();
    const allotmentDate = allotmentIso(cell(source, "date of alloment", "date of allotment", "allotment date", "date"));
    const unitsText = cell(source, "number of units", "units", "quantity").replace(/,/g, "").trim();
    const units = Number(unitsText);
    const tokens = panTokens(pan);
    const matched = tokens.map((token) => byPan.get(token)).find(Boolean);
    if (!isin) errors.push("ISIN number is required.");
    else if (!/^[A-Z0-9]{12}$/.test(isin)) errors.push("Enter a 12-character ISIN.");
    if (!description) errors.push("ISIN description is required.");
    if (!allottee) errors.push("Name of allottee is required.");
    if (!pan) errors.push("PAN number is required.");
    else if (tokens.length === 0) errors.push("Enter a valid PAN.");
    else if (!matched) errors.push("This PAN does not match a client.");
    if (!allotmentDate) errors.push("Date of allotment must be DD-MM-YYYY.");
    if (!Number.isFinite(units) || units <= 0) errors.push("Number of units must be greater than zero.");
    return {
      line: row.line,
      ok: errors.length === 0,
      errors,
      values: {
        srno: srNo,
        isin,
        description,
        allotmentdate: allotmentDate,
        allottee,
        pan,
        units: Number.isFinite(units) && units > 0 ? unitsText : "",
        clientcode: matched?.code ?? "",
        clientname: matched?.name ?? "",
      },
    };
  });
}

async function previewLedgerStatement(
  statement: NonNullable<ReturnType<typeof parseLedgerStatement>>,
  clientCode: string,
) {
  const matched = await statementClientCode(statement.headerLines, clientCode);
  const code = matched.code;
  if (statement.entries.length === 0) {
    return [{ line: 1, ok: false, errors: ["No ledger rows were found."], values: {} }];
  }
  return statement.entries.map((entry) => {
    const errors: string[] = [];
    if (!code) errors.push(matched.error);
    if (!entry.date) errors.push("Date is required.");
    if (!entry.narration) errors.push("Particulars are required.");
    if (!Number.isFinite(entry.amount) || entry.amount <= 0) errors.push("Debit or credit must be greater than zero.");
    return {
      line: entry.line,
      ok: errors.length === 0,
      errors,
      values: {
        clientcode: code,
        date: entry.date,
        type: entry.type,
        amount: String(entry.amount),
        narration: entry.narration,
        particulars: entry.particulars,
        vchtype: entry.vchType,
        vchno: entry.vchNo,
      },
    };
  });
}

export async function commitImport(actor: string, type: ImportKind, fileName: string, csv: string, clientCode = "") {
  await ensureAdmin();
  const rows = await previewImport(type, csv, clientCode);
  const valid = rows.filter((row) => row.ok);
  const grouped = new Map<string, ImportRow[]>();
  valid.forEach((row) => {
    const code = cell(row.values, "clientcode", "client_code", "code");
    const list = grouped.get(code) ?? [];
    list.push(row);
    grouped.set(code, list);
  });

  for (const [code, group] of grouped) {
    if (type === "ledger") {
      await importLedgerRows(
        code,
        group.map((row) => ({
          date: cell(row.values, "date"),
          type: cell(row.values, "type").toLowerCase() as "debit" | "credit",
          amount: Number(cell(row.values, "amount")),
          narration: cell(row.values, "narration"),
          particulars: cell(row.values, "particulars"),
          vchType: cell(row.values, "vchtype"),
          vchNo: cell(row.values, "vchno"),
        })),
        "replace",
      );
    } else {
      const holdingRows = [];
      for (const row of group) {
        const identifier = cell(row.values, "identifier", "security", "isin").toUpperCase();
        const description = cell(row.values, "description");
        const quantity = Number(cell(row.values, "quantity", "units"));
        const averageCost = Number(cell(row.values, "averagecost", "average_cost") || 0);
        const marketValue = Number(cell(row.values, "marketvalue", "market_value") || 0);
        holdingRows.push({
          identifier,
          name: description || (await knownSecurity(identifier)) || identifier,
          quantity,
          averageCost,
          marketValue,
          srNo: cell(row.values, "srno"),
          allotmentDate: cell(row.values, "allotmentdate"),
          allotteeName: cell(row.values, "allottee"),
          pan: cell(row.values, "pan"),
        });
      }
      await importHoldingRows(code, holdingRows);
    }
  }

  const clients = [...new Set(valid.map((row) => cell(row.values, "clientcode")).filter(Boolean))];
  const names: string[] = [];
  for (const client of clients) {
    names.push((await getPortal(client))?.profile.fullName || client);
  }
  const job: ImportJob = {
    id: `imp-${imports.length + 1}`,
    type,
    fileName: fileName || `${type}.csv`,
    status: valid.length > 0 ? "committed" : "failed",
    valid: valid.length,
    failed: rows.length - valid.length,
    at: stamp(),
    actor,
    clientCode: clients.join(", "),
    clientName: names.join(", "),
  };
  imports.unshift(job);
  await recordAudit({
    actor,
    action: "Import committed",
    detail: `${job.fileName}: ${job.valid} valid, ${job.failed} failed`,
    clientCode: "",
  });

  const errorReport = ["line,error", ...rows.filter((row) => !row.ok).map((row) => `${row.line},"${row.errors.join("; ")}"`)].join("\n");
  return { job, rows, errorReport };
}

export async function recentImports() {
  await ensureAdmin();
  return imports;
}

export async function statementRuns() {
  await ensureAdmin();
  return runs;
}

export async function queueStatement(input: {
  actor: string;
  clientCode: string;
  statementType: string;
  period: string;
  mode: "manual" | "scheduled";
  frequency: string;
}) {
  await ensureAdmin();
  const portal = await getPortal(input.clientCode);
  if (!portal) return null;
  const at = stamp();
  const statementId = `stmt-${Date.now()}`;
  if (input.mode === "manual") {
    await addGeneratedStatement(input.clientCode, {
      id: statementId,
      period: input.period,
      issuedOn: at.slice(0, 10),
      fileName: `${input.clientCode}-${input.statementType.replace(/\s+/g, "-")}.pdf`,
      statementType: input.statementType,
    });
  }
  const run: StatementRun = {
    id: `run-${runs.length + 1}`,
    clientCode: input.clientCode,
    clientName: portal.profile.fullName,
    statementType: input.statementType,
    period: input.period,
    mode: input.mode,
    frequency: input.mode === "scheduled" ? input.frequency : "",
    status: input.mode === "scheduled" ? "scheduled" : "generated",
    at,
    actor: input.actor,
    ...(input.mode === "manual" ? { statementId } : {}),
  };
  runs.unshift(run);
  await recordAudit({
    actor: input.actor,
    action: input.mode === "scheduled" ? "Statement scheduled" : "Statement generated",
    detail: `${input.statementType} ${input.period}`,
    clientCode: input.clientCode,
  });
  return run;
}

export async function commandCenter() {
  await ensureAdmin();
  const portals = await listPortals();
  const failedImports = imports.reduce((sum, job) => sum + job.failed, 0);
  const sent = runs.filter((run) => run.status === "sent" || run.status === "generated").length;
  const scheduled = runs.filter((run) => run.status === "scheduled").length;
  return {
    aum: portals.reduce((sum, item) => sum + item.metrics.totalPortfolioValue, 0),
    sessions: sessions.slice(0, 6),
    imports: imports.slice(0, 6),
    failedImports,
    sent,
    scheduled,
    audit: audit.slice(0, 8),
  };
}

export async function listStaff() {
  await ensureAdmin();
  return [...staff.values()].map((account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    status: account.status,
  }));
}

export async function directoryAccounts() {
  await ensureAdmin();
  const portals = await listPortals();
  return {
    investors: portals.map((portal) => ({
      id: portal.profile.email,
      code: portal.profile.tradingCode,
    })),
    staff: [...staff.values()].map((account) => ({
      id: account.email,
      staffId: account.id,
      protected: account.role === "superadmin",
    })),
  };
}

export async function deleteDirectoryAccount(kind: string, id: string) {
  await ensureAdmin();
  if (kind === "investor") {
    const removed = await removeInvestor(id);
    if (!removed) return { error: "That investor was not found." as const };
    removeWhere(audit, (entry) => entry.clientCode === id || entry.entityId === id);
    removeWhere(runs, (run) => run.clientCode === id);
    await persistPlatform();
    return { ok: true as const };
  }
  if (kind === "staff") {
    const account = staff.get(id);
    if (!account) return { error: "That user was not found." as const };
    if (account.role === "superadmin") return { error: "The super admin cannot be deleted." as const };
    staff.delete(id);
    const db = await getDb();
    await db.collection("staff").deleteOne({ _id: id });
    removeWhere(sessions, (session) => session.staffId === id);
    removeWhere(audit, (entry) => entry.userId === id || entry.entityId === id);
    await persistPlatform();
    return { ok: true as const };
  }
  return { error: "Choose a user to delete." as const };
}

function removeWhere<T>(items: T[], match: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (match(items[index])) items.splice(index, 1);
  }
}

export async function updateStaff(
  actor: AdminUser,
  id: string,
  patch: { name?: string; role?: AdminRole; status?: StaffStatus },
) {
  await ensureAdmin();
  const account = staff.get(id);
  if (!account) return { error: "Staff account not found." as const };
  if (actor.id === id && patch.status === "suspended") {
    return { error: "You cannot suspend your own account." as const };
  }
  if (patch.name) account.name = patch.name.trim();
  if (patch.role) account.role = patch.role;
  if (patch.status) account.status = patch.status;
  await persistStaff(account.id);
  await recordAudit({
    actor: actor.name,
    userId: actor.id,
    action: patch.status === "suspended" ? "Staff suspended" : "Staff updated",
    targetEntity: "staff",
    entityId: account.id,
    detail: `${account.name} · ${account.role} · ${account.status}`,
  });
  return {
    user: { id: account.id, name: account.name, email: account.email, role: account.role, status: account.status },
  };
}

export async function createStaff(actor: string, input: { name: string; email: string; role: AdminRole; password: string }) {
  await ensureAdmin();
  const email = input.email.trim().toLowerCase();
  if ([...staff.values()].some((account) => account.email === email)) {
    return { error: "A staff account with this email already exists." as const };
  }
  const user: AdminUser = {
    id: `staff-${staff.size + 1}`,
    name: input.name.trim(),
    email,
    role: input.role,
  };
  seedStaff(user, input.password);
  await persistStaff(user.id);
  await recordAudit({
    actor,
    action: "Staff created",
    detail: `${user.name} (${user.role})`,
    clientCode: "",
  });
  return { user };
}

export async function listAudit(filters?: { actor?: string; action?: string; entity?: string }) {
  await ensureAdmin();
  const actor = filters?.actor?.trim().toLowerCase() ?? "";
  const action = filters?.action?.trim().toLowerCase() ?? "";
  const entity = filters?.entity?.trim().toLowerCase() ?? "";
  return audit.filter((entry) => {
    if (actor && !entry.actor.toLowerCase().includes(actor) && !entry.userId.toLowerCase().includes(actor)) return false;
    if (action && !entry.action.toLowerCase().includes(action)) return false;
    if (entity && !entry.targetEntity.toLowerCase().includes(entity) && !entry.entityId.toLowerCase().includes(entity)) return false;
    return true;
  });
}

export function roleCan(role: AdminRole, moduleName: string) {
  return roleAccess[role][moduleName as (typeof modules)[number]] === true;
}

export async function accessFor(role: AdminRole) {
  await ensureAdmin();
  return { role, modules: roleAccess[role] };
}

export async function roleMatrix() {
  await ensureAdmin();
  return { modules: [...modules], roles: roleAccess };
}

const lockedAdminModules = new Set(["users", "audit", "schedules", "platform", "ledger"]);

export async function saveAdminPermissions(actor: AdminUser, next: Record<string, boolean>) {
  await ensureAdmin();
  modules.forEach((moduleName) => {
    if (lockedAdminModules.has(moduleName)) {
      roleAccess.admin[moduleName] = false;
      return;
    }
    if (typeof next[moduleName] === "boolean") roleAccess.admin[moduleName] = next[moduleName];
  });
  await recordAudit({
    actor: actor.name,
    userId: actor.id,
    action: "Role permissions updated",
    targetEntity: "role",
    entityId: "admin",
    detail: "Admin module access changed",
  });
  return roleMatrix();
}

function sortedNav() {
  return [...navEntries].sort((left, right) => {
    const byDate = right.date.localeCompare(left.date);
    if (byDate !== 0) return byDate;
    return right.addedAt.localeCompare(left.addedAt);
  });
}

function validNavDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export async function listNav(page = 1) {
  await ensureAdmin();
  const sorted = sortedNav();
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / navPageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (current - 1) * navPageSize;
  return {
    entries: sorted.slice(start, start + navPageSize),
    page: current,
    pageSize: navPageSize,
    total,
    pages,
    latest: sorted[0] ?? null,
  };
}

export async function saveNav(actor: AdminUser, input: { date: string; nav: number }) {
  await ensureAdmin();
  const date = input.date.trim();
  if (!validNavDate(date)) return { error: "Enter a valid NAV date." as const };
  if (date > todayIso()) return { error: "NAV date cannot be in the future." as const };
  if (!Number.isFinite(input.nav) || input.nav <= 0) return { error: "Enter a NAV greater than zero." as const };
  const entry: NavEntry = {
    id: `nav-${Date.now()}`,
    date,
    nav: Math.round(input.nav * 10000) / 10000,
    addedBy: actor.name,
    addedAt: stamp(),
  };
  navEntries.push(entry);
  await recordAudit({
    actor: actor.name,
    userId: actor.id,
    action: "NAV added",
    targetEntity: "nav",
    entityId: entry.id,
    detail: `${entry.date} · ${entry.nav}`,
  });
  return { entry, latest: sortedNav()[0] };
}

export async function platformState() {
  await ensureAdmin();
  return { kra: kraSettings, securities: await listSecurities(), schedules: scheduleRules };
}

export async function saveKra(actor: AdminUser, input: { endpoint: string; token: string; timeoutSeconds: number }) {
  await ensureAdmin();
  kraSettings.endpoint = input.endpoint.trim();
  kraSettings.token = input.token.trim();
  kraSettings.timeoutSeconds = input.timeoutSeconds;
  await recordAudit({
    actor: actor.name,
    userId: actor.id,
    action: "KRA settings updated",
    targetEntity: "integration",
    entityId: "kra",
    detail: kraSettings.endpoint,
  });
  return kraSettings;
}

export async function addSecurity(actor: AdminUser, input: { identifier: string; name: string; isin: string }) {
  await ensureAdmin();
  const saved = await saveSecurity(input);
  if (!saved) return null;
  await recordAudit({
    actor: actor.name,
    userId: actor.id,
    action: "Security master updated",
    targetEntity: "security",
    entityId: saved.identifier,
    detail: `${saved.name} · ${saved.isin}`,
  });
  return saved;
}

export async function saveSchedule(
  actor: AdminUser,
  input: { frequency: "daily" | "weekly" | "monthly"; target: string; retries: number; preventDuplicates: boolean },
) {
  await ensureAdmin();
  const rule = { id: `sch-${scheduleRules.length + 1}`, ...input, target: input.target.trim() || "all-active" };
  scheduleRules.unshift(rule);
  await recordAudit({
    actor: actor.name,
    userId: actor.id,
    action: "Statement schedule saved",
    targetEntity: "schedule",
    entityId: rule.id,
    detail: `${rule.frequency} · ${rule.target} · retries ${rule.retries}`,
  });
  return rule;
}

export async function overrideLedger(
  actor: AdminUser,
  input: { clientCode: string; date: string; type: "debit" | "credit"; amount: number; narration: string; reason: string },
) {
  await ensureAdmin();
  const ok = await importLedgerRows(input.clientCode, [
    { date: input.date, type: input.type, amount: input.amount, narration: `Override: ${input.narration}` },
  ]);
  if (!ok) return null;
  await recordAudit({
    actor: actor.name,
    userId: actor.id,
    action: "Ledger override",
    targetEntity: "ledger",
    entityId: input.clientCode,
    clientCode: input.clientCode,
    detail: `${input.reason} · ${input.type} ${input.amount}`,
  });
  return { ok: true };
}
