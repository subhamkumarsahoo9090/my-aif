import { jsonError } from "./http.js";
import { getPortal } from "./portal-store.js";
import { readSession } from "./session.js";
import type { PortalData } from "./types.js";

export async function authorizePortal(request: Request): Promise<
  | { portal: PortalData; clientCode: string; response?: undefined }
  | { portal?: undefined; clientCode?: undefined; response: Response }
> {
  const session = await readSession();
  if (!session) {
    return { response: jsonError("Sign in required.", 401) };
  }

  const requested = new URL(request.url).searchParams.get("client_code");
  if (requested && requested !== session.clientCode) {
    return {
      response: jsonError("You can only view your own investor records.", 403),
    };
  }

  const portal = await getPortal(session.clientCode);
  if (!portal) {
    return { response: jsonError("Sign in required.", 401) };
  }

  return { portal, clientCode: session.clientCode };
}
