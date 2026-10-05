import { toAdminUser } from "@/lib/admin-store";
import { staffVersion } from "@/lib/admin-store";
import { readAdminSession } from "@/lib/session";

export async function GET() {
  const session = await readAdminSession();
  if (!session) return Response.json({ user: null });
  if ((await staffVersion(session.staffId)) !== session.passwordVersion) {
    return Response.json({ user: null });
  }
  return Response.json({ user: await toAdminUser(session.staffId) });
}
