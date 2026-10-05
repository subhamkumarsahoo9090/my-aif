import { asRecord, jsonError, readJson } from "@/lib/http";
import { verifyResetCode } from "@/lib/session";

export async function POST(request: Request) {
  const body = asRecord(await readJson(request));
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!/^\d{6}$/.test(code)) {
    return jsonError("Enter the 6-digit verification code.", 400);
  }

  const clientCode = await verifyResetCode(code);
  if (!clientCode) {
    return jsonError(
      "That verification code is incorrect or has expired. Request a new one.",
      400,
    );
  }

  return Response.json({ message: "Code verified." });
}
