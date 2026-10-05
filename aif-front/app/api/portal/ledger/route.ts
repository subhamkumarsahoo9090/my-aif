import { authorizePortal } from "@/lib/guard";

export async function GET(request: Request) {
  const auth = await authorizePortal(request);
  if (auth.response) return auth.response;
  return Response.json({
    clientCode: auth.clientCode,
    rows: auth.portal.ledger,
  });
}
