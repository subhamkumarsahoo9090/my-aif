import * as admin from "../functions/admin.functions.js";
import { controller, respond } from "./respond.js";

export const login = controller((req) => admin.login(req.body ?? {}));
export const session = controller(() => admin.session());
export const access = controller(() => admin.access());
export const overview = controller(() => admin.overview());
export const command = controller(() => admin.command());
export const clients = controller(() => admin.clients());
export const createClient = controller((req) => admin.createClient(req.body));
export const client = controller((req) => admin.client(req.params.code));
export const updateClient = controller((req) => admin.updateClient(req.params.code, req.body));
export const staff = controller(() => admin.staff());
export const createStaff = controller((req) => admin.createStaffAccount(req.body ?? {}));
export const updateStaff = controller((req) => admin.updateStaffAccount(req.params.id, req.body));
export const roles = controller(() => admin.roles());
export const saveRoles = controller((req) => admin.saveRoles(req.body ?? {}));
export const imports = controller(() => admin.imports());
export const importFile = controller((req) => admin.importFile(req.body ?? {}));
export const reports = controller(() => admin.reports());
export const createReport = controller((req) => admin.createReport(req.body ?? {}));
export async function reportFile(req, res, next) {
  try {
    const result = await admin.reportFile(req.params.code, req.query ?? {});
    if (result.file) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", result.disposition);
      res.setHeader("Cache-Control", "private, no-store");
      res.send(Buffer.from(result.bytes));
      return;
    }
    respond(res, result);
  } catch (error) {
    next(error);
  }
}
export const navHistory = controller((req) => admin.navHistory(req.query ?? {}));
export const addNav = controller((req) => admin.addNav(req.body ?? {}));
export const audit = controller((req) => admin.audit(req.query ?? {}));
export const platform = controller(() => admin.platform());
export const platformAction = controller((req) => admin.platformAction(req.body ?? {}));
export const ifsc = controller((req) => admin.ifscLookup(req.params.code));
