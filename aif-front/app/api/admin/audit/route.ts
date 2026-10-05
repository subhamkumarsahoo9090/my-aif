import { listAudit } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";

export async function GET(request: Request) {
  const auth = await authorizeAdmin("superadmin");
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  return Response.json({
    audit: await listAudit({
      actor: url.searchParams.get("actor") ?? "",
      action: url.searchParams.get("action") ?? "",
      entity: url.searchParams.get("entity") ?? "",
    }),
  });
}
