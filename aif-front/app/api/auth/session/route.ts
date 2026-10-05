import { toSessionUser } from "@/lib/portal-store";
import { readSession } from "@/lib/session";

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ user: null });
  return Response.json({ user: await toSessionUser(session.clientCode) });
}
