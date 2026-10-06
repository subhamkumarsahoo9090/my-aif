import {
  accessFor,
  addSecurity,
  adminOverview,
  authenticateStaff,
  clientRecord,
  clientRows,
  commandCenter,
  commitImport,
  createStaff,
  editClient,
  listAudit,
  listStaff,
  noteStaffLogin,
  overrideLedger,
  platformState,
  previewImport,
  queueStatement,
  recentImports,
  roleMatrix,
  saveAdminPermissions,
  saveClient,
  saveKra,
  saveSchedule,
  staffVersion,
  statementRuns,
  toAdminUser,
  updateStaff,
  listNav,
  saveNav,
} from "../lib/admin-store.js";
import { authorizeAdmin } from "../lib/admin-guard.js";
import { openAdminSession, readAdminSession } from "../lib/session.js";
import { readCreateClientBody } from "../lib/client-validation.js";
import { denied, fail, ok } from "./result.js";

function text(body, key) {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

function optionalText(body, key) {
  return typeof body[key] === "string" ? body[key].trim() : undefined;
}

function readNominees(body) {
  if (!Array.isArray(body.nominees)) return undefined;
  return body.nominees
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      name: typeof item.name === "string" ? item.name.trim() : "",
      relationship: typeof item.relationship === "string" ? item.relationship.trim() : "",
    }));
}

function readBank(body) {
  const bank = body.bank;
  if (!bank || typeof bank !== "object") return undefined;
  const value = (key) => (typeof bank[key] === "string" ? bank[key].trim() : "");
  return {
    accountNumber: value("accountNumber"),
    ifsccode: value("ifsccode").toUpperCase(),
    accountHolderName: value("accountHolderName"),
    upiId: value("upiId"),
    bankCity: value("bankCity"),
    bankName: value("bankName"),
    micrCode: value("micrCode"),
    accountType: value("accountType"),
    isPrimary: true,
    dpOrderId: value("dpOrderId"),
  };
}

async function adminOf(minimum, moduleName) {
  const auth = await authorizeAdmin(minimum, moduleName);
  const blocked = await denied(auth);
  if (blocked) return { blocked };
  return { user: auth.user };
}

function importKind(value) {
  return value === "ledger" || value === "holdings" ? value : null;
}

export async function login(body) {
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email.trim() || !password) return fail("Enter the admin email and password.", 400);

  const account = await authenticateStaff(email, password);
  if (account === "suspended") return fail("This staff account is suspended.", 403);
  if (!account) return fail("Email or password is incorrect.", 401);

  await noteStaffLogin(account);
  const token = await openAdminSession(account.id, account.role, account.version);
  return ok({ user: await toAdminUser(account.id), token });
}

export async function session() {
  const current = await readAdminSession();
  if (!current) return ok({ user: null });
  if ((await staffVersion(current.staffId)) !== current.passwordVersion) return ok({ user: null });
  return ok({ user: await toAdminUser(current.staffId) });
}

export async function access() {
  const { blocked, user } = await adminOf();
  if (blocked) return blocked;
  return ok(await accessFor(user.role));
}

export async function overview() {
  const { blocked } = await adminOf();
  if (blocked) return blocked;
  return ok(await adminOverview());
}

export async function command() {
  const { blocked } = await adminOf("superadmin");
  if (blocked) return blocked;
  return ok(await commandCenter());
}

export async function clients() {
  const { blocked } = await adminOf("admin", "clients");
  if (blocked) return blocked;
  return ok({ clients: await clientRows() });
}

export async function createClient(body) {
  const { blocked, user } = await adminOf("admin", "clients");
  if (blocked) return blocked;
  const parsed = readCreateClientBody(body);
  if (!parsed.ok) return fail(parsed.message, 400);

  const result = await saveClient(user.name, parsed.value);
  if ("error" in result && result.error) return fail(result.error, 409);
  return ok(result);
}

export async function client(code) {
  const { blocked } = await adminOf("admin", "clients");
  if (blocked) return blocked;
  const record = await clientRecord(code);
  if (!record) return fail("Client not found.", 404);
  return ok(record);
}

export async function updateClient(code, body) {
  const { blocked, user } = await adminOf("admin", "clients");
  if (blocked) return blocked;
  if (!body || typeof body !== "object") return fail("Enter the client details.", 400);

  const status = body.status === "active" || body.status === "inactive" ? body.status : undefined;
  const nominees = readNominees(body);
  const bank = readBank(body);
  const portal = await editClient(user.name, code, {
    fullName: optionalText(body, "fullName"),
    email: optionalText(body, "email"),
    mobile: optionalText(body, "mobile"),
    pan: optionalText(body, "pan")?.toUpperCase(),
    dateOfBirth: optionalText(body, "dateOfBirth"),
    address: optionalText(body, "address"),
    occupation: optionalText(body, "occupation"),
    nomineeName: optionalText(body, "nomineeName"),
    nomineeRelationship: optionalText(body, "nomineeRelationship"),
    nominees,
    bankName: optionalText(body, "bankName"),
    accountNumber: optionalText(body, "accountNumber"),
    ifsc: optionalText(body, "ifsc")?.toUpperCase(),
    banks: bank ? [bank] : undefined,
    status,
    kra: typeof body.kra === "boolean" ? body.kra : undefined,
    fatca: typeof body.fatca === "boolean" ? body.fatca : undefined,
  });
  if (!portal) return fail("Client not found.", 404);
  return ok({ portal });
}

export async function staff() {
  const { blocked } = await adminOf("superadmin");
  if (blocked) return blocked;
  return ok({ staff: await listStaff() });
}

export async function createStaffAccount(body) {
  const { blocked, user } = await adminOf("superadmin");
  if (blocked) return blocked;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role === "superadmin" ? "superadmin" : "admin";
  if (!name || !email || password.length < 6) {
    return fail("Name, email, and a password of at least 6 characters are required.", 400);
  }
  const result = await createStaff(user.name, { name, email, role, password });
  if ("error" in result && result.error) return fail(result.error, 409);
  return ok(result);
}

export async function updateStaffAccount(id, body) {
  const { blocked, user } = await adminOf("superadmin");
  if (blocked) return blocked;
  if (!body || typeof body !== "object") return fail("Enter the staff changes.", 400);
  const role = body.role === "admin" || body.role === "superadmin" ? body.role : undefined;
  const status = body.status === "active" || body.status === "suspended" ? body.status : undefined;
  const name = typeof body.name === "string" ? body.name : undefined;
  const result = await updateStaff(user, id, { name, role, status });
  if ("error" in result && result.error) return fail(result.error, 400);
  return ok(result);
}

export async function roles() {
  const { blocked } = await adminOf("superadmin");
  if (blocked) return blocked;
  return ok(await roleMatrix());
}

export async function saveRoles(body) {
  const { blocked, user } = await adminOf("superadmin");
  if (blocked) return blocked;
  const permissions = body?.admin && typeof body.admin === "object" ? body.admin : null;
  if (!permissions) return fail("Send the admin permission checklist.", 400);
  const next = {};
  Object.entries(permissions).forEach(([key, value]) => {
    if (typeof value === "boolean") next[key] = value;
  });
  return ok(await saveAdminPermissions(user, next));
}

export async function imports() {
  const { blocked } = await adminOf("admin", "imports");
  if (blocked) return blocked;
  return ok({ imports: await recentImports() });
}

export async function importFile(body) {
  const { blocked, user } = await adminOf("admin", "imports");
  if (blocked) return blocked;
  const type = importKind(body?.type);
  const csv = typeof body?.csv === "string" ? body.csv : "";
  const clientCode = typeof body?.clientCode === "string" ? body.clientCode : "";
  const step = body?.step === "commit" ? "commit" : "preview";
  if (!type || !csv.trim()) return fail("Choose an import type and a ledger file.", 400);

  if (step === "preview") {
    const rows = await previewImport(type, csv, clientCode);
    return ok({
      rows,
      valid: rows.filter((row) => row.ok).length,
      failed: rows.filter((row) => !row.ok).length,
    });
  }

  const fileName = typeof body?.fileName === "string" ? body.fileName : `${type}.csv`;
  return ok(await commitImport(user.name, type, fileName, csv, clientCode));
}

export async function reports() {
  const { blocked } = await adminOf("admin", "reports");
  if (blocked) return blocked;
  return ok({ runs: await statementRuns() });
}

export async function createReport(body) {
  const { blocked, user } = await adminOf("admin", "reports");
  if (blocked) return blocked;
  const clientCode = typeof body?.clientCode === "string" ? body.clientCode : "";
  const statementType = typeof body?.statementType === "string" ? body.statementType.trim() : "";
  const period = typeof body?.period === "string" ? body.period.trim() : "";
  const mode = body?.mode === "scheduled" ? "scheduled" : "manual";
  const frequency = typeof body?.frequency === "string" ? body.frequency : "monthly";
  if (!clientCode || !statementType || !period) {
    return fail("Choose a client, statement type, and period.", 400);
  }
  const run = await queueStatement({
    actor: user.name,
    clientCode,
    statementType,
    period,
    mode,
    frequency,
  });
  if (!run) return fail("Client not found.", 404);
  return ok({ run });
}

export async function navHistory(query) {
  const { blocked } = await adminOf("admin", "nav");
  if (blocked) return blocked;
  const page = Number(query.page);
  return ok(await listNav(Number.isFinite(page) ? page : 1));
}

export async function addNav(body) {
  const { blocked, user } = await adminOf("admin", "nav");
  if (blocked) return blocked;
  const date = typeof body?.date === "string" ? body.date : "";
  const nav = Number(body?.nav);
  const result = await saveNav(user, { date, nav });
  if ("error" in result && result.error) return fail(result.error, 400);
  return ok(result);
}

export async function audit(query) {
  const { blocked } = await adminOf("superadmin");
  if (blocked) return blocked;
  return ok({
    audit: await listAudit({
      actor: typeof query.actor === "string" ? query.actor : "",
      action: typeof query.action === "string" ? query.action : "",
      entity: typeof query.entity === "string" ? query.entity : "",
    }),
  });
}

export async function platform() {
  const { blocked } = await adminOf("superadmin");
  if (blocked) return blocked;
  return ok(await platformState());
}

export async function platformAction(body) {
  const { blocked, user } = await adminOf("superadmin");
  if (blocked) return blocked;
  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "kra") {
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    const token = typeof body?.token === "string" ? body.token : "";
    const timeoutSeconds = Number(body?.timeoutSeconds);
    if (!endpoint || !token || !Number.isFinite(timeoutSeconds)) {
      return fail("Endpoint, token, and timeout are required.", 400);
    }
    return ok({ kra: await saveKra(user, { endpoint, token, timeoutSeconds }) });
  }

  if (action === "security") {
    const identifier = typeof body?.identifier === "string" ? body.identifier : "";
    const name = typeof body?.name === "string" ? body.name : "";
    const isin = typeof body?.isin === "string" ? body.isin : "";
    const saved = await addSecurity(user, { identifier, name, isin });
    if (!saved) return fail("Identifier and name are required.", 400);
    return ok({ security: saved });
  }

  if (action === "schedule") {
    const frequency = body?.frequency === "daily" || body?.frequency === "weekly" || body?.frequency === "monthly"
      ? body.frequency
      : "monthly";
    const target = typeof body?.target === "string" ? body.target : "all-active";
    const retries = Number(body?.retries);
    return ok({
      schedule: await saveSchedule(user, {
        frequency,
        target,
        retries: Number.isFinite(retries) ? retries : 1,
        preventDuplicates: body?.preventDuplicates !== false,
      }),
    });
  }

  if (action === "override") {
    const clientCode = typeof body?.clientCode === "string" ? body.clientCode : "";
    const date = typeof body?.date === "string" ? body.date : "";
    const type = body?.type === "credit" ? "credit" : "debit";
    const amount = Number(body?.amount);
    const narration = typeof body?.narration === "string" ? body.narration.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!clientCode || !date || !narration || !reason || !Number.isFinite(amount) || amount <= 0) {
      return fail("Client, date, amount, narration, and reason are required.", 400);
    }
    const result = await overrideLedger(user, { clientCode, date, type, amount, narration, reason });
    if (!result) return fail("Client not found.", 404);
    return ok(result);
  }

  return fail("Unknown platform action.", 400);
}

const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export async function ifscLookup(code) {
  const { blocked } = await adminOf("admin", "clients");
  if (blocked) return blocked;
  const ifsc = String(code ?? "").trim().toUpperCase();
  if (!ifscPattern.test(ifsc)) return fail("Enter a valid IFSC code.", 400);

  let response;
  try {
    response = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
  } catch {
    return fail("The bank directory could not be reached.", 502);
  }
  if (response.status === 404) return fail("That IFSC code was not found.", 404);
  if (!response.ok) return fail("The bank directory could not be read.", 502);

  const data = await response.json().catch(() => null);
  const bankName = textValue(data?.BANK);
  const bankCity = textValue(data?.CITY) || textValue(data?.DISTRICT) || textValue(data?.CENTRE);
  const micrCode = textValue(data?.MICR);
  if (!bankName) return fail("That IFSC code was not found.", 404);
  return ok({
    bankName,
    bankCity,
    micrCode: /^\d{9}$/.test(micrCode) ? micrCode : "",
  });
}

function textValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
