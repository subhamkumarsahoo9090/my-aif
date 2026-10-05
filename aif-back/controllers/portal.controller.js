import * as portal from "../functions/portal.functions.js";
import { controller, respond } from "./respond.js";

export const summary = controller((req) => portal.summary(req));
export const profile = controller((req) => portal.profile(req));
export const holdings = controller((req) => portal.holdings(req));
export const ledger = controller((req) => portal.ledger(req));
export const statements = controller((req) => portal.statements(req));

export async function statementFile(req, res, next) {
  try {
    const result = await portal.statementFile(req);
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
