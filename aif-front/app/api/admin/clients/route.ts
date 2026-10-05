import { clientRows, saveClient } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";
import { readCreateClientBody } from "@/lib/client-validation";
import { jsonError, readJson } from "@/lib/http";

export async function GET() {
  const auth = await authorizeAdmin("admin", "clients");
  if (auth.response) return auth.response;
  return Response.json({ clients: await clientRows() });
}

export async function POST(request: Request) {
  const auth = await authorizeAdmin("admin", "clients");
  if (auth.response) return auth.response;
  const parsed = readCreateClientBody(await readJson(request));
  if (!parsed.ok) return jsonError(parsed.message, 400);

  const result = await saveClient(auth.user.name, parsed.value);
  if ("error" in result && result.error) return jsonError(result.error, 409);
  return Response.json(result);
}
