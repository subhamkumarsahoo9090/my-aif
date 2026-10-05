import { roleMatrix, saveAdminPermissions } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";
import { asRecord, jsonError, readJson } from "@/lib/http";

export async function GET() {
  const auth = await authorizeAdmin("superadmin");
  if (auth.response) return auth.response;
  return Response.json(await roleMatrix());
}

export async function PUT(request: Request) {
  const auth = await authorizeAdmin("superadmin");
  if (auth.response) return auth.response;
  const body = asRecord(await readJson(request));
  const permissions = asRecord(body?.admin);
  if (!permissions) return jsonError("Send the admin permission checklist.", 400);
  const next: Record<string, boolean> = {};
  Object.entries(permissions).forEach(([key, value]) => {
    if (typeof value === "boolean") next[key] = value;
  });
  return Response.json(await saveAdminPermissions(auth.user, next));
}
