import { authenticateStaff, noteStaffLogin, toAdminUser } from "@/lib/admin-store";
import { asRecord, jsonError, readJson } from "@/lib/http";
import { openAdminSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = asRecord(await readJson(request));
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email.trim() || !password) {
    return jsonError("Enter the admin email and password.", 400);
  }

  const account = await authenticateStaff(email, password);
  if (account === "suspended") return jsonError("This staff account is suspended.", 403);
  if (!account) return jsonError("Email or password is incorrect.", 401);

  await noteStaffLogin(account);
  await openAdminSession(account.id, account.role, account.version);
  return Response.json({ user: await toAdminUser(account.id) });
}
