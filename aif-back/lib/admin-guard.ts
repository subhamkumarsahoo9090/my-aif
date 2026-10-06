import { getStaff, roleCan, staffVersion, type AdminRole, type AdminUser } from "./admin-store.js";
import { jsonError } from "./http.js";
import { readAdminSession } from "./session.js";

export async function authorizeAdmin(minimum: AdminRole = "admin", moduleName?: string): Promise<
  | { user: AdminUser; response?: undefined }
  | { user?: undefined; response: Response }
> {
  const session = await readAdminSession();
  if (!session) return { response: jsonError("Admin sign in required.", 401) };
  const version = await staffVersion(session.staffId);
  if (version === null || version !== session.passwordVersion) {
    return { response: jsonError("Admin sign in required.", 401) };
  }
  const account = await getStaff(session.staffId);
  if (!account) return { response: jsonError("Admin sign in required.", 401) };
  if (account.status === "suspended") {
    return { response: jsonError("This staff account is suspended.", 403) };
  }
  if (minimum === "superadmin" && account.role !== "superadmin") {
    return { response: jsonError("Super admin access is required.", 403) };
  }
  if (moduleName && !roleCan(account.role, moduleName)) {
    return { response: jsonError("This module is not enabled for your role.", 403) };
  }
  return {
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
    },
  };
}
