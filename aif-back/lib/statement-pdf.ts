import { formatDate, formatInrPlain, formatQuantity } from "./format.js";
import { buildPdfDocument, type PdfOp, type Rgb } from "./pdf.js";
import type { PortalData, StatementMeta } from "./types.js";

const navy: Rgb = [0.07, 0.16, 0.34];
const ink: Rgb = [0.08, 0.16, 0.28];
const muted: Rgb = [0.42, 0.5, 0.6];
const line: Rgb = [0.86, 0.91, 0.96];
const white: Rgb = [1, 1, 1];
const pale: Rgb = [0.78, 0.86, 0.95];
const pageBg: Rgb = [0.96, 0.98, 1];
const iconBg: Rgb = [0.9, 0.94, 0.99];
const iconBlue: Rgb = [0.16, 0.4, 0.78];
const gain: Rgb = [0.09, 0.55, 0.33];
const loss: Rgb = [0.72, 0.18, 0.18];
const bar: Rgb = [0.8, 0.89, 0.97];

const margin = 24;
const contentWidth = 547;

type Cell = { text: string; color: Rgb; bold?: boolean };
type Column = { label: string; x: number; align?: "left" | "right" };

function clip(value: string, length = 42) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function text(
  value: string,
  x: number,
  y: number,
  size: number,
  color: Rgb,
  options: { bold?: boolean; align?: "left" | "right" } = {},
): PdfOp {
  return { kind: "text", text: value, x, y, size, color, bold: options.bold, align: options.align };
}

function card(x: number, y: number, w: number, h: number, r = 12): PdfOp[] {
  return [
    { kind: "round", x, y, w, h, r, fill: line },
    { kind: "round", x: x + 0.7, y: y + 0.7, w: w - 1.4, h: h - 1.4, r, fill: white },
  ];
}

function person(cx: number, cy: number, color: Rgb): PdfOp[] {
  return [
    { kind: "circle", x: cx, y: cy + 2.6, r: 2.3, fill: color },
    { kind: "round", x: cx - 4, y: cy - 5, w: 8, h: 5.2, r: 2.4, fill: color },
  ];
}

function documentIcon(cx: number, cy: number, color: Rgb, mark: Rgb): PdfOp[] {
  return [
    { kind: "round", x: cx - 3.4, y: cy - 5, w: 6.8, h: 10, r: 1, fill: color },
    { kind: "rect", x: cx - 2, y: cy + 1.4, w: 4, h: 0.7, fill: mark },
    { kind: "rect", x: cx - 2, y: cy - 0.2, w: 4, h: 0.7, fill: mark },
    { kind: "rect", x: cx - 2, y: cy - 1.8, w: 2.4, h: 0.7, fill: mark },
  ];
}

function cardIcon(cx: number, cy: number, color: Rgb, mark: Rgb): PdfOp[] {
  return [
    { kind: "round", x: cx - 5, y: cy - 3.2, w: 10, h: 6.6, r: 1.2, fill: color },
    { kind: "rect", x: cx - 5, y: cy + 0.8, w: 10, h: 1.2, fill: mark },
  ];
}

function calendar(cx: number, cy: number, color: Rgb, mark: Rgb): PdfOp[] {
  return [
    { kind: "round", x: cx - 4.4, y: cy - 4.6, w: 8.8, h: 8.6, r: 1.2, fill: color },
    { kind: "rect", x: cx - 4.4, y: cy + 1.4, w: 8.8, h: 1.8, fill: mark },
    { kind: "rect", x: cx - 2.2, y: cy + 2.6, w: 0.9, h: 2, fill: color },
    { kind: "rect", x: cx + 1.3, y: cy + 2.6, w: 0.9, h: 2, fill: color },
    { kind: "rect", x: cx - 1.8, y: cy - 2.2, w: 3.6, h: 2, fill: mark },
  ];
}

function stack(cx: number, cy: number, color: Rgb): PdfOp[] {
  return [
    { kind: "round", x: cx - 4.6, y: cy + 1.8, w: 9.2, h: 2.3, r: 1.1, fill: color },
    { kind: "round", x: cx - 4.6, y: cy - 1.1, w: 9.2, h: 2.3, r: 1.1, fill: color },
    { kind: "round", x: cx - 4.6, y: cy - 4, w: 9.2, h: 2.3, r: 1.1, fill: color },
  ];
}

function pin(cx: number, cy: number, color: Rgb, mark: Rgb): PdfOp[] {
  return [
    { kind: "circle", x: cx, y: cy + 1.4, r: 3.1, fill: color },
    { kind: "round", x: cx - 1.3, y: cy - 5.2, w: 2.6, h: 4.2, r: 1.2, fill: color },
    { kind: "circle", x: cx, y: cy + 1.5, r: 1.2, fill: mark },
  ];
}

function mail(cx: number, cy: number, color: Rgb, mark: Rgb): PdfOp[] {
  return [
    { kind: "round", x: cx - 5, y: cy - 3.4, w: 10, h: 6.8, r: 1, fill: color },
    { kind: "rect", x: cx - 3.2, y: cy - 0.3, w: 6.4, h: 0.7, fill: mark },
    { kind: "rect", x: cx - 1.6, y: cy - 1.6, w: 3.2, h: 0.7, fill: mark },
  ];
}

function phone(cx: number, cy: number, color: Rgb, mark: Rgb): PdfOp[] {
  return [
    { kind: "round", x: cx - 2.8, y: cy - 5, w: 5.6, h: 10, r: 1.3, fill: color },
    { kind: "rect", x: cx - 1.2, y: cy - 3.4, w: 2.4, h: 0.7, fill: mark },
  ];
}

function badge(cx: number, cy: number, fill: Rgb, glyph: PdfOp[]): PdfOp[] {
  return [{ kind: "circle", x: cx, y: cy, r: 11, fill }, ...glyph];
}

function shell(statementTitle: string, pageLabel: string): PdfOp[] {
  const bars = [22, 36, 52, 70, 46, 88, 64];
  const decor: PdfOp[] = bars.map((height, index) => ({
    kind: "round",
    x: 438 + index * 16,
    y: 64,
    w: 10,
    h: height,
    r: 3,
    fill: bar,
  }));
  return [
    { kind: "rect", x: 0, y: 0, w: 595, h: 842, fill: pageBg },
    ...decor,
    { kind: "rect", x: 0, y: 776, w: 595, h: 66, fill: navy },
    { kind: "image", name: "Im1", x: 22, y: 786, w: 136, h: 46 },
    text(statementTitle, 571, 812, 18, white, { bold: true, align: "right" }),
    ...documentIcon(571 - pageLabel.length * 4.4 - 14, 794, white, navy),
    text(pageLabel, 571, 790, 8, pale, { align: "right" }),
    { kind: "rect", x: 0, y: 0, w: 595, h: 52, fill: navy },
    ...pin(36, 26, white, navy),
    text("Express Tower, Sector 62, Noida, UP 201301", 50, 22, 8, white),
    { kind: "rect", x: 338, y: 14, w: 0.8, h: 24, fill: pale },
    ...mail(358, 34, white, navy),
    text("info@wealthdiscovery.in", 372, 30, 8, white),
    ...phone(358, 16, white, navy),
    text("91 11 4344 4666", 372, 12, 8, pale),
  ];
}

function identity(portal: PortalData, statement: StatementMeta): PdfOp[] {
  const { profile } = portal;
  const y = 686;
  const h = 76;
  const columns: Array<{ label: string; value: string; icon: PdfOp[] }> = [
    { label: "INVESTOR", value: clip(profile.fullName, 18), icon: person(0, 0, iconBlue) },
    { label: "TRADING CODE", value: profile.tradingCode || "-", icon: documentIcon(0, 0, iconBlue, white) },
    { label: "PAN", value: profile.pan || "-", icon: cardIcon(0, 0, iconBlue, white) },
    { label: "PERIOD", value: clip(statement.period, 14), icon: calendar(0, 0, iconBlue, white) },
  ];
  const ops: PdfOp[] = [...card(margin, y, contentWidth, h, 14)];
  columns.forEach((column, index) => {
    const x = margin + 16 + index * 134;
    const shifted = column.icon.map((op) => {
      if (op.kind === "circle" || op.kind === "round" || op.kind === "rect") {
        return { ...op, x: op.x + x + 11, y: op.y + y + 40 };
      }
      return op;
    });
    ops.push(...badge(x + 11, y + 40, iconBg, shifted));
    ops.push(text(column.label, x + 28, y + 48, 7, muted));
    ops.push(text(column.value || "-", x + 28, y + 32, 11, ink, { bold: true }));
    if (index > 0) ops.push({ kind: "rect", x: x - 10, y: y + 16, w: 0.7, h: 44, fill: line });
  });
  ops.push(text(`Issued ${formatDate(statement.issuedOn)}`, margin + 44, y + 16, 8, muted));
  return ops;
}

function sectionHeading(title: string, subtitle: string, top: number): PdfOp[] {
  return [
    ...badge(margin + 28, top - 24, iconBlue, stack(margin + 28, top - 24, white)),
    text(title, margin + 46, top - 20, 14, navy, { bold: true }),
    text(subtitle, margin + 46, top - 34, 8, muted),
    { kind: "round", x: margin + contentWidth - 78, y: top - 22, w: 54, h: 5, r: 2.5, fill: [0.55, 0.74, 0.95] },
    { kind: "round", x: margin + contentWidth - 78, y: top - 22, w: 28, h: 5, r: 2.5, fill: iconBlue },
  ];
}

function portfolioPage(portal: PortalData, statement: StatementMeta): PdfOp[] {
  const { metrics } = portal;
  const top = 670;
  const panelBottom = 360;
  const tiles: Array<[string, string, Rgb]> = [
    ["Invested capital", formatInrPlain(metrics.investedCapital), ink],
    ["Current valuation", formatInrPlain(metrics.currentValuation), ink],
    ["Realized P&L", formatInrPlain(metrics.realizedPnl), metrics.realizedPnl < 0 ? loss : gain],
    ["Unrealized P&L", formatInrPlain(metrics.unrealizedPnl), metrics.unrealizedPnl < 0 ? loss : gain],
  ];
  const ops: PdfOp[] = [
    ...shell(statement.statementType || "Portfolio", "Investor statement"),
    ...identity(portal, statement),
    ...card(margin, panelBottom, contentWidth, top - panelBottom, 14),
    ...sectionHeading("Portfolio", "Current valuation of this investor", top),
    { kind: "round", x: margin + 16, y: 560, w: contentWidth - 32, h: 64, r: 10, fill: navy },
    text("TOTAL PORTFOLIO VALUE", margin + 32, 598, 8, pale),
    text(formatInrPlain(metrics.totalPortfolioValue), margin + 32, 576, 18, white, { bold: true }),
  ];
  tiles.forEach(([label, value, color], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 16 + column * 258;
    const y = 470 - row * 78;
    ops.push(...card(x, y, 246, 66, 10));
    ops.push(text(label.toUpperCase(), x + 16, y + 42, 7, muted));
    ops.push(text(value, x + 16, y + 20, 13, color, { bold: true }));
  });
  return ops;
}

function tablePages(
  portal: PortalData,
  statement: StatementMeta,
  subtitle: string,
  columns: Column[],
  rows: Cell[][],
  empty: string,
): PdfOp[][] {
  const title = statement.statementType || "Statement";
  const rowHeight = 24;
  const cardTop = 670;
  const headerBottom = 606;
  const capacity = 20;
  const chunks: Cell[][][] = [];
  if (rows.length === 0) chunks.push([]);
  else {
    for (let index = 0; index < rows.length; index += capacity) {
      chunks.push(rows.slice(index, index + capacity));
    }
  }

  return chunks.map((chunk, pageIndex) => {
    const lastBaseline = headerBottom - 16 - Math.max(chunk.length - 1, 0) * rowHeight;
    const cardBottom = chunk.length === 0 ? headerBottom - 48 : lastBaseline - 18;
    const ops: PdfOp[] = [
      ...shell(title, `Page ${pageIndex + 1} of ${chunks.length}`),
      ...identity(portal, statement),
      ...card(margin, cardBottom, contentWidth, cardTop - cardBottom, 14),
      ...sectionHeading(title, subtitle, cardTop),
      { kind: "round", x: margin + 16, y: headerBottom, w: contentWidth - 32, h: 22, r: 4, fill: navy },
    ];
    columns.forEach((column) => {
      ops.push(text(column.label, column.x, headerBottom + 7, 7, white, { bold: true, align: column.align }));
    });
    if (chunk.length === 0) {
      ops.push(text(empty, margin + 28, headerBottom - 24, 10, muted));
    }
    chunk.forEach((row, rowIndex) => {
      const y = headerBottom - 16 - rowIndex * rowHeight;
      ops.push({ kind: "rect", x: margin + 16, y: y - 8, w: contentWidth - 32, h: 0.5, fill: line });
      row.forEach((cell, cellIndex) => {
        const column = columns[cellIndex];
        ops.push(text(cell.text, column.x, y, 9, cell.color, { bold: cell.bold, align: column.align }));
      });
    });
    return ops;
  });
}

export function renderStatement(portal: PortalData, statement: StatementMeta) {
  const kind = (statement.statementType ?? "Portfolio").toLowerCase();
  const title = `Wealth Discovery - ${statement.statementType || "Investor statement"}`;

  if (kind.includes("holding")) {
    const rows = portal.holdings.map((holding) => [
      { text: holding.identifier, color: iconBlue, bold: true },
      { text: clip(holding.name, 34), color: muted },
      { text: formatQuantity(holding.quantity), color: ink },
      { text: formatInrPlain(holding.marketValue), color: holding.marketValue < 0 ? loss : gain, bold: true },
    ]);
    return buildPdfDocument(
      tablePages(
        portal,
        statement,
        "Your current investment holdings and market value",
        [
          { label: "ISIN", x: margin + 28 },
          { label: "DESCRIPTION", x: 168 },
          { label: "UNITS", x: 430, align: "right" },
          { label: "MARKET VALUE", x: 547, align: "right" },
        ],
        rows,
        "No holdings are on file for this investor.",
      ),
      title,
    );
  }

  if (kind.includes("capital")) {
    const rows = portal.ledger.map((row) => [
      { text: formatDate(row.date), color: ink, bold: true },
      { text: row.type === "credit" ? "Credit" : "Debit", color: row.type === "credit" ? gain : loss, bold: true },
      { text: formatInrPlain(row.amount), color: row.type === "credit" ? gain : loss, bold: true },
      { text: formatInrPlain(row.balance), color: ink },
      { text: clip(row.narration, 22), color: muted },
    ]);
    return buildPdfDocument(
      tablePages(
        portal,
        statement,
        "Ledger of contributions, withdrawals, and balance",
        [
          { label: "DATE", x: margin + 28 },
          { label: "TYPE", x: 130 },
          { label: "AMOUNT", x: 292, align: "right" },
          { label: "BALANCE", x: 390, align: "right" },
          { label: "NARRATION", x: 406 },
        ],
        rows,
        "No ledger rows are on file for this investor.",
      ),
      title,
    );
  }

  return buildPdfDocument([portfolioPage(portal, statement)], title);
}
