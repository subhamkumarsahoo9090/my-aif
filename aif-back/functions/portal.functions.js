import { authorizePortal } from "../lib/guard.js";
import { currentNav } from "../lib/portal-store.js";
import { statementDownloadName } from "../lib/pdf.js";
import { renderStatement } from "../lib/statement-pdf.js";
import { denied, fail, ok } from "./result.js";

function asRequest(req) {
  const host = req.headers.host || "localhost";
  return new Request(new URL(req.originalUrl, `http://${host}`));
}

function monthLabel(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (!year || !month || !day) return iso;
  return `${day} ${months[month - 1]} ${String(year).slice(2)}`;
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function isInvestedCredit(row) {
  return row.type === "credit" && (row.narration.startsWith("Capital contribution") || Boolean(row.particulars || row.vchType));
}

export function valuationTrend(portal) {
  const credits = [...portal.ledger]
    .filter(isInvestedCredit)
    .sort((left, right) => left.date.localeCompare(right.date));
  const lots = [...portal.holdings]
    .filter((row) => row.allotmentDate)
    .sort((left, right) => left.allotmentDate.localeCompare(right.allotmentDate));
  const dates = new Set([todayIso()]);
  credits.forEach((row) => {
    if (row.date) dates.add(row.date);
  });
  lots.forEach((row) => dates.add(row.allotmentDate));

  let capital = 0;
  let creditIndex = 0;
  let value = 0;
  let lotIndex = 0;
  return [...dates].sort().map((date) => {
    while (creditIndex < credits.length && credits[creditIndex].date <= date) {
      capital += credits[creditIndex].amount;
      creditIndex += 1;
    }
    while (lotIndex < lots.length && lots[lotIndex].allotmentDate <= date) {
      value += lots[lotIndex].marketValue;
      lotIndex += 1;
    }
    return {
      date,
      label: monthLabel(date),
      capital,
      value: date === todayIso() ? portal.metrics.currentValuation : value,
    };
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
    disposition: `${download ? "attachment" : "inline"}; filename="${statementDownloadName(statement.fileName)}"`,
  };
}
