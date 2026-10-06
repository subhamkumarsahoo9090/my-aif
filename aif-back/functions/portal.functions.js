import { authorizePortal } from "../lib/guard.ts";
import { currentNav } from "../lib/portal-store.ts";
import { renderStatement } from "../lib/statement-pdf.ts";
import { denied, fail, ok } from "./result.js";

function asRequest(req) {
  const host = req.headers.host || "localhost";
  return new Request(new URL(req.originalUrl, `http://${host}`));
}

function valuationTrend(portal) {
  const contributions = [...portal.ledger]
    .filter((row) => row.type === "credit" && row.narration.startsWith("Capital contribution"))
    .sort((left, right) => left.date.localeCompare(right.date));
  const endValue = portal.metrics.currentValuation;
  const first = contributions[0];
  if (!first) return [{ date: "", label: "Now", value: endValue }];

  const start = new Date(`${first.date}T00:00:00`);
  const lastLedger = [...portal.ledger].sort((left, right) => left.date.localeCompare(right.date)).at(-1);
  const finish = new Date(`${lastLedger?.date ?? first.date}T00:00:00`);
  const steps = 6;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    const time = start.getTime() + (finish.getTime() - start.getTime()) * progress;
    const date = new Date(time);
    const value = index === steps ? endValue : Math.round(first.amount + (endValue - first.amount) * progress);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return { date: date.toISOString().slice(0, 10), label: `Q${quarter} ${date.getFullYear()}`, value };
  });
}

async function portalOf(req) {
  const auth = await authorizePortal(asRequest(req));
  const blocked = await denied(auth);
  if (blocked) return { blocked };
  return { auth };
}

export async function summary(req) {
  const { blocked, auth } = await portalOf(req);
  if (blocked) return blocked;
  const { portal, clientCode } = auth;
  return ok({
    clientCode,
    kraStatus: portal.profile.kra ? "verified" : "pending",
    metrics: portal.metrics,
    recentTransactions: [...portal.ledger].reverse().slice(0, 5),
    latestStatement: portal.statements[0] ?? null,
    holdings: portal.holdings.map((holding) => ({
      name: holding.name,
      marketValue: holding.marketValue,
    })),
    trend: valuationTrend(portal),
  });
}

export async function profile(req) {
  const { blocked, auth } = await portalOf(req);
  if (blocked) return blocked;
  return ok({ clientCode: auth.clientCode, profile: auth.portal.profile });
}

export async function holdings(req) {
  const { blocked, auth } = await portalOf(req);
  if (blocked) return blocked;
  return ok({
    clientCode: auth.clientCode,
    rows: auth.portal.holdings,
    latestNav: await currentNav(),
  });
}

export async function ledger(req) {
  const { blocked, auth } = await portalOf(req);
  if (blocked) return blocked;
  return ok({ clientCode: auth.clientCode, rows: auth.portal.ledger });
}

export async function statements(req) {
  const { blocked, auth } = await portalOf(req);
  if (blocked) return blocked;
  return ok({ clientCode: auth.clientCode, rows: auth.portal.statements });
}

export async function statementFile(req) {
  const { blocked, auth } = await portalOf(req);
  if (blocked) return blocked;
  const statement = auth.portal.statements.find((item) => item.id === req.params.id);
  if (!statement) return fail("That statement is not available.", 404);
  const download = req.query.download === "1";
  return {
    ok: true,
    file: true,
    bytes: renderStatement(auth.portal, statement),
    disposition: `${download ? "attachment" : "inline"}; filename="${statement.fileName}"`,
  };
}
