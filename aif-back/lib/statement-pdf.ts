import { formatDate, formatInrPlain } from "./format.js";
import { buildPdf } from "./pdf.js";
import type { PortalData, StatementMeta } from "./types.js";

export function renderStatement(portal: PortalData, statement: StatementMeta) {
  const { profile, metrics } = portal;
  return buildPdf([
    "AIF Client Portal",
    "Investor statement",
    `Period: ${statement.period}`,
    `Issued: ${formatDate(statement.issuedOn)}`,
    `Trading code: ${profile.tradingCode}`,
    `Investor: ${profile.fullName}`,
    `PAN: ${profile.pan}`,
    `Total portfolio value: ${formatInrPlain(metrics.totalPortfolioValue)}`,
    `Invested capital: ${formatInrPlain(metrics.investedCapital)}`,
    `Current valuation: ${formatInrPlain(metrics.currentValuation)}`,
    `Realized P&L: ${formatInrPlain(metrics.realizedPnl)}`,
    `Unrealized P&L: ${formatInrPlain(metrics.unrealizedPnl)}`,
    "Prepared only for the investor signed in to this portal.",
  ]);
}
