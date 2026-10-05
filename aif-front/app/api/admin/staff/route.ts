import { createStaff, listStaff, type AdminRole } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";
import { asRecord, jsonError, readJson } from "@/lib/http";

export async function GET() {
  const auth = await authorizeAdmin("superadmin");
  if (auth.response) return auth.response;
  return Response.json({ staff: await listStaff() });
}

export async function POST(request: Request) {
  const auth = await authorizeAdmin("superadmin");
  if (auth.response) return auth.response;
  const body = asRecord(await readJson(request));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role: AdminRole = body?.role === "superadmin" ? "superadmin" : "admin";
  if (!name || !email || password.length < 6) {
    return jsonError("Name, email, and a password of at least 6 characters are required.", 400);
  }
  const result = await createStaff(auth.user.name, { name, email, role, password });
  if ("error" in result && result.error) return jsonError(result.error, 409);
  return Response.json(result);
}
