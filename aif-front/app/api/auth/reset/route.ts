import { asRecord, jsonError, readJson } from "@/lib/http";
import { passwordError } from "@/lib/password";
import { updatePassword } from "@/lib/portal-store";
import { clearReset, clearSession, readVerifiedReset } from "@/lib/session";

export async function POST(request: Request) {
  const clientCode = await readVerifiedReset();
  if (!clientCode) {
    return jsonError("Verify the code before choosing a new password.", 400);
  }

  const body = asRecord(await readJson(request));
  const password = typeof body?.password === "string" ? body.password : "";
  const message = passwordError(password);
  if (message) return jsonError(message, 400);

  if (!(await updatePassword(clientCode, password))) {
    return jsonError("The investor account could not be updated.", 400);
  }

  await clearReset();
  await clearSession();
  return Response.json({
    message:
      "Password updated. Sign in with the new password.",
  });
}
