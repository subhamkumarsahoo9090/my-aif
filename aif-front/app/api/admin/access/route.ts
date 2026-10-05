import { accessFor } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";

export async function GET() {
  const auth = await authorizeAdmin();
  if (auth.response) return auth.response;
  return Response.json(await accessFor(auth.user.role));
}
