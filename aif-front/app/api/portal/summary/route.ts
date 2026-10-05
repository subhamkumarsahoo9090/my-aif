import { authorizePortal } from "@/lib/guard";
import type { PortalData } from "@/lib/types";

function valuationTrend(portal: PortalData) {
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

export async function GET(request: Request) {
  const auth = await authorizePortal(request);
  if (auth.response) return auth.response;

  const { portal, clientCode } = auth;
  return Response.json({
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
