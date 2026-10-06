import { authenticateStaff, deleteDirectoryAccount, directoryAccounts, noteStaffLogin } from "../lib/admin-store.js";
import { canonicalIdentifier } from "../lib/identifier.js";
import { passwordError } from "../lib/password.js";
import { authenticate, findClientCode, toSessionUser, updatePassword } from "../lib/portal-store.js";
import {
  clearReset,
  clearSession,
  createDemoCode,
  openAdminSession,
  openSession,
  readSession,
  readVerifiedReset,
  startReset,
  verifyResetCode,
} from "../lib/session.js";
import { fail, ok } from "./result.js";

export async function login(body) {
  const identifier = typeof body.identifier === "string" ? body.identifier : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!canonicalIdentifier(identifier) || !password) {
    return fail("Enter your mobile or email and password.", 400);
  }

  const account = await authenticate(identifier, password);
  if (account) {
    const clientCode = account.portal.profile.tradingCode;
    const token = await openSession(clientCode);
    return ok({ user: await toSessionUser(clientCode), destination: "/dashboard", token });
  }

  const canonical = canonicalIdentifier(identifier);
  if (canonical?.kind === "email") {
    const staff = await authenticateStaff(canonical.value, password);
    if (staff === "suspended") return fail("This staff account is suspended.", 403);
    if (staff) {
      await noteStaffLogin(staff);
      const token = await openAdminSession(staff.id, staff.role, staff.version);
      return ok({ destination: "/admin", token });
    }
  }

  return fail("Mobile, email, or password is incorrect.", 401);
}

export async function accounts() {
  return ok(await directoryAccounts());
}

export async function deleteAccount(body) {
  const kind = typeof body?.kind === "string" ? body.kind : "";
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return fail("Choose a user to delete.", 400);
  const result = await deleteDirectoryAccount(kind, id);
  if ("error" in result && result.error) return fail(result.error, 400);
  return ok({ ok: true });
}

export async function logout() {
  await clearSession();
  return ok({ ok: true });
}

export async function session() {
  const current = await readSession();
  if (!current) return ok({ user: null });
  return ok({ user: await toSessionUser(current.clientCode) });
}

export async function forgot(body) {
  const identifier = typeof body.identifier === "string" ? body.identifier : "";
  if (!canonicalIdentifier(identifier)) {
    return fail("Enter the mobile number or email on the account.", 400);
  }

  const clientCode = await findClientCode(identifier);
  if (!clientCode) {
    return fail("No investor account matches that mobile number or email.", 400);
  }

  const demoCode = createDemoCode();
  await startReset(clientCode, demoCode);
  return ok({ message: "Verification code issued.", demoCode });
}

export async function verifyOtp(body) {
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit verification code.", 400);

  const clientCode = await verifyResetCode(code);
  if (!clientCode) {
    return fail("That verification code is incorrect or has expired. Request a new one.", 400);
  }
  return ok({ message: "Code verified." });
}

export async function resetPassword(body) {
  const clientCode = await readVerifiedReset();
  if (!clientCode) return fail("Verify the code before choosing a new password.", 400);

  const password = typeof body.password === "string" ? body.password : "";
  const message = passwordError(password);
  if (message) return fail(message, 400);

  if (!(await updatePassword(clientCode, password))) {
    return fail("The investor account could not be updated.", 400);
  }

  await clearReset();
  await clearSession();
  return ok({ message: "Password updated. Sign in with the new password." });
}
