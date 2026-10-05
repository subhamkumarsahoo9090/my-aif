import { authorizePortal } from "@/lib/guard";
import { jsonError } from "@/lib/http";
import { renderStatement } from "@/lib/statement-pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizePortal(request);
  if (auth.response) return auth.response;

  const { id } = await params;
  const statement = auth.portal.statements.find((item) => item.id === id);
  if (!statement) return jsonError("That statement is not available.", 404);

  const download = new URL(request.url).searchParams.get("download") === "1";
  const bytes = renderStatement(auth.portal, statement);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${statement.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
