import { canonicalIdentifier } from "@/lib/identifier";
import { asRecord, jsonError, readJson } from "@/lib/http";
import { findClientCode } from "@/lib/portal-store";
import { createDemoCode, startReset } from "@/lib/session";

export async function POST(request: Request) {
  const body = asRecord(await readJson(request));
  const identifier = typeof body?.identifier === "string" ? body.identifier : "";

  if (!canonicalIdentifier(identifier)) {
    return jsonError("Enter the mobile number or email on the account.", 400);
  }

  const clientCode = await findClientCode(identifier);
  if (!clientCode) {
    return jsonError(
      "No investor account matches that mobile number or email.",
      400,
    );
  }

  const demoCode = createDemoCode();
  await startReset(clientCode, demoCode);
  return Response.json({
    message: "Verification code issued.",
    demoCode,
  });
}
