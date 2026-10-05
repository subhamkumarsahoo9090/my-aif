import { clientRecord, editClient } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";
import { asRecord, jsonError, readJson } from "@/lib/http";
import type { BankAccount, ClientStatus, Nominee } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const auth = await authorizeAdmin("admin", "clients");
  if (auth.response) return auth.response;
  const { code } = await params;
  const record = await clientRecord(code);
  if (!record) return jsonError("Client not found.", 404);
  return Response.json(record);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const auth = await authorizeAdmin("admin", "clients");
  if (auth.response) return auth.response;
  const { code } = await params;
  const body = asRecord(await readJson(request));
  if (!body) return jsonError("Enter the client details.", 400);

  const text = (key: string) => (typeof body[key] === "string" ? body[key].trim() : undefined);
  const status: ClientStatus | undefined =
    body.status === "active" || body.status === "inactive" ? body.status : undefined;
  const nominees = readNominees(body.nominees);
  const bank = readBank(body.bank);
  const portal = await editClient(auth.user.name, code, {
    fullName: text("fullName"),
    email: text("email"),
    mobile: text("mobile"),
    pan: text("pan")?.toUpperCase(),
    dateOfBirth: text("dateOfBirth"),
    address: text("address"),
    nomineeName: text("nomineeName"),
    nomineeRelationship: text("nomineeRelationship"),
    nominees,
    bankName: text("bankName"),
    accountNumber: text("accountNumber"),
    ifsc: text("ifsc")?.toUpperCase(),
    banks: bank ? [bank] : undefined,
    status,
    kra: typeof body.kra === "boolean" ? body.kra : undefined,
    fatca: typeof body.fatca === "boolean" ? body.fatca : undefined,
  });
  if (!portal) return jsonError("Client not found.", 404);
  return Response.json({ portal });
}

function readNominees(value: unknown): Nominee[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        name: typeof row.name === "string" ? row.name.trim() : "",
        relationship: typeof row.relationship === "string" ? row.relationship.trim() : "",
      };
    });
}

function readBank(value: unknown): BankAccount | undefined {
  if (!value || typeof value !== "object") return undefined;
  const bank = value as Record<string, unknown>;
  const text = (key: string) => (typeof bank[key] === "string" ? bank[key].trim() : "");
  return {
    accountNumber: text("accountNumber"),
    ifsccode: text("ifsccode").toUpperCase(),
    accountHolderName: text("accountHolderName"),
    upiId: text("upiId"),
    bankCity: text("bankCity"),
    bankName: text("bankName"),
    micrCode: text("micrCode"),
    accountType: text("accountType"),
    isPrimary: true,
    dpOrderId: text("dpOrderId"),
  };
}
