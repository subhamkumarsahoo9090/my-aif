import {
  addSecurity,
  overrideLedger,
  platformState,
  saveKra,
  saveSchedule,
} from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";
import { asRecord, jsonError, readJson } from "@/lib/http";

export async function GET() {
  const auth = await authorizeAdmin("superadmin");
  if (auth.response) return auth.response;
  return Response.json(await platformState());
}

export async function POST(request: Request) {
  const auth = await authorizeAdmin("superadmin");
  if (auth.response) return auth.response;
  const body = asRecord(await readJson(request));
  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "kra") {
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    const token = typeof body?.token === "string" ? body.token : "";
    const timeoutSeconds = Number(body?.timeoutSeconds);
    if (!endpoint || !token || !Number.isFinite(timeoutSeconds)) {
      return jsonError("Endpoint, token, and timeout are required.", 400);
    }
    return Response.json({ kra: await saveKra(auth.user, { endpoint, token, timeoutSeconds }) });
  }

  if (action === "security") {
    const identifier = typeof body?.identifier === "string" ? body.identifier : "";
    const name = typeof body?.name === "string" ? body.name : "";
    const isin = typeof body?.isin === "string" ? body.isin : "";
    const saved = await addSecurity(auth.user, { identifier, name, isin });
    if (!saved) return jsonError("Identifier and name are required.", 400);
    return Response.json({ security: saved });
  }

  if (action === "schedule") {
    const frequency = body?.frequency === "daily" || body?.frequency === "weekly" || body?.frequency === "monthly"
      ? body.frequency
      : "monthly";
    const target = typeof body?.target === "string" ? body.target : "all-active";
    const retries = Number(body?.retries);
    return Response.json({
      schedule: await saveSchedule(auth.user, {
        frequency,
        target,
        retries: Number.isFinite(retries) ? retries : 1,
        preventDuplicates: body?.preventDuplicates !== false,
      }),
    });
  }

  if (action === "override") {
    const clientCode = typeof body?.clientCode === "string" ? body.clientCode : "";
    const date = typeof body?.date === "string" ? body.date : "";
    const type = body?.type === "credit" ? "credit" : "debit";
    const amount = Number(body?.amount);
    const narration = typeof body?.narration === "string" ? body.narration.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!clientCode || !date || !narration || !reason || !Number.isFinite(amount) || amount <= 0) {
      return jsonError("Client, date, amount, narration, and reason are required.", 400);
    }
    const result = await overrideLedger(auth.user, { clientCode, date, type, amount, narration, reason });
    if (!result) return jsonError("Client not found.", 404);
    return Response.json(result);
  }

  return jsonError("Unknown platform action.", 400);
}
