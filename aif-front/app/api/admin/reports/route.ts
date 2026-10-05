import { queueStatement, statementRuns } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";
import { asRecord, jsonError, readJson } from "@/lib/http";

export async function GET() {
  const auth = await authorizeAdmin("admin", "reports");
  if (auth.response) return auth.response;
  return Response.json({ runs: await statementRuns() });
}

export async function POST(request: Request) {
  const auth = await authorizeAdmin("admin", "reports");
  if (auth.response) return auth.response;
  const body = asRecord(await readJson(request));
  const clientCode = typeof body?.clientCode === "string" ? body.clientCode : "";
  const statementType = typeof body?.statementType === "string" ? body.statementType.trim() : "";
  const period = typeof body?.period === "string" ? body.period.trim() : "";
  const mode = body?.mode === "scheduled" ? "scheduled" : "manual";
  const frequency = typeof body?.frequency === "string" ? body.frequency : "monthly";
  if (!clientCode || !statementType || !period) {
    return jsonError("Choose a client, statement type, and period.", 400);
  }
  const run = await queueStatement({
    actor: auth.user.name,
    clientCode,
    statementType,
    period,
    mode,
    frequency,
  });
  if (!run) return jsonError("Client not found.", 404);
  return Response.json({ run });
}
