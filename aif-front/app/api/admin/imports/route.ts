import { commitImport, previewImport, recentImports, type ImportKind } from "@/lib/admin-store";
import { authorizeAdmin } from "@/lib/admin-guard";
import { asRecord, jsonError, readJson } from "@/lib/http";

function kind(value: unknown): ImportKind | null {
  return value === "ledger" || value === "holdings" ? value : null;
}

export async function GET() {
  const auth = await authorizeAdmin("admin", "imports");
  if (auth.response) return auth.response;
  return Response.json({ imports: await recentImports() });
}

export async function POST(request: Request) {
  const auth = await authorizeAdmin("admin", "imports");
  if (auth.response) return auth.response;
  const body = asRecord(await readJson(request));
  const type = kind(body?.type);
  const csv = typeof body?.csv === "string" ? body.csv : "";
  const clientCode = typeof body?.clientCode === "string" ? body.clientCode : "";
  const step = body?.step === "commit" ? "commit" : "preview";
  if (!type || !csv.trim()) return jsonError("Choose an import type and a ledger file.", 400);

  if (step === "preview") {
    const rows = await previewImport(type, csv, clientCode);
    return Response.json({
      rows,
      valid: rows.filter((row) => row.ok).length,
      failed: rows.filter((row) => !row.ok).length,
    });
  }

  const fileName = typeof body?.fileName === "string" ? body.fileName : `${type}.csv`;
  return Response.json(await commitImport(auth.user.name, type, fileName, csv, clientCode));
}
