import { adminOverview } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";

export async function GET() {
  const auth = await authorizeAdmin();
  if (auth.response) return auth.response;
  return Response.json(await adminOverview());
}
