import { updateStaff } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";
import { asRecord, jsonError, readJson } from "@/lib/http";
import type { AdminRole } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeAdmin("superadmin");
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = asRecord(await readJson(request));
  if (!body) return jsonError("Enter the staff changes.", 400);
  const role: AdminRole | undefined =
    body.role === "admin" || body.role === "superadmin" ? body.role : undefined;
  const status = body.status === "active" || body.status === "suspended" ? body.status : undefined;
  const name = typeof body.name === "string" ? body.name : undefined;
  const result = await updateStaff(auth.user, id, { name, role, status });
  if ("error" in result && result.error) return jsonError(result.error, 400);
  return Response.json(result);
}
