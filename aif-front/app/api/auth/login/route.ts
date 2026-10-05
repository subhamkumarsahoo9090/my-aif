import { authenticateStaff, noteStaffLogin } from "@/lib/admin-store";
import { canonicalIdentifier } from "@/lib/identifier";
import { asRecord, jsonError, readJson } from "@/lib/http";
import { authenticate, toSessionUser } from "@/lib/portal-store";
import { openAdminSession, openSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = asRecord(await readJson(request));
  const identifier = typeof body?.identifier === "string" ? body.identifier : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!canonicalIdentifier(identifier) || !password) {
    return jsonError("Enter your mobile or email and password.", 400);
  }

  const account = await authenticate(identifier, password);
  if (account) {
    const clientCode = account.portal.profile.tradingCode;
    await openSession(clientCode);
    return Response.json({ user: await toSessionUser(clientCode), destination: "/dashboard" });
  }

  const canonical = canonicalIdentifier(identifier);
  if (canonical?.kind === "email") {
    const staff = await authenticateStaff(canonical.value, password);
    if (staff === "suspended") {
      return jsonError("This staff account is suspended.", 403);
    }
    if (staff) {
      await noteStaffLogin(staff);
      await openAdminSession(staff.id, staff.role, staff.version);
      return Response.json({ destination: "/admin" });
    }
  }

  return jsonError("Mobile, email, or password is incorrect.", 401);
}
