export type NavMark = { date: string; nav: number };

export type HoldingIdentity = {
  identifier: string;
  pan?: string;
  allotmentDate?: string;
  quantity: number;
  costNav?: number;
};

export type ImportPlan = {
  status: "insert" | "skip" | "fail";
  reason?: string;
  costNav?: number;
};

export function normalizePan(value: string | undefined) {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeQuantity(value: number) {
  return String(Math.round(value * 10000) / 10000);
}

export function holdingSignature(row: HoldingIdentity) {
  const date = row.allotmentDate?.trim() ?? "";
  const pan = normalizePan(row.pan);
  if (!date || !pan) return "";
  return `${row.identifier.trim().toUpperCase()}|${date}|${pan}|${normalizeQuantity(row.quantity)}`;
}

export function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function plusOneYear(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const year = Number(match[1]) + 1;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1) {
    const last = new Date(year, month, 0);
    return isoDate(last);
  }
  return isoDate(date);
}

export function completedOneYear(allotmentDate: string, asOf: string) {
  const anniversary = plusOneYear(allotmentDate);
  return Boolean(anniversary) && allotmentDate <= asOf && asOf >= anniversary;
}

export function navAsOf(points: NavMark[], asOf: string) {
  let chosen: number | null = null;
  for (const point of [...points].sort((left, right) => left.date.localeCompare(right.date))) {
    if (!point.date || point.date > asOf || !Number.isFinite(point.nav)) continue;
    chosen = point.nav;
  }
  return chosen;
}

export function referenceNav(lots: HoldingIdentity[], asOf: string) {
  const eligible = lots
    .filter((lot) => {
      const date = lot.allotmentDate?.trim() ?? "";
      return Boolean(date) && date <= asOf && completedOneYear(date, asOf) && lot.costNav != null && Number.isFinite(lot.costNav);
    })
    .sort((left, right) => (left.allotmentDate ?? "").localeCompare(right.allotmentDate ?? ""));
  return eligible.length === 0 ? null : eligible[eligible.length - 1].costNav ?? null;
}

export function lotPnl(lot: HoldingIdentity, currentNav: number, reference: number | null, asOf: string) {
  const date = lot.allotmentDate?.trim() ?? "";
  if (!date || date > asOf || !completedOneYear(date, asOf) || reference == null) return 0;
  return money(money(lot.quantity * reference) - money(lot.quantity * currentNav));
}

export function eligiblePnl(lots: HoldingIdentity[], currentNav: number, asOf: string) {
  const reference = referenceNav(lots, asOf);
  return money(lots.reduce((sum, lot) => sum + lotPnl(lot, currentNav, reference, asOf), 0));
}

export function planHoldingImport(existing: HoldingIdentity[], incoming: HoldingIdentity[], currentNav: number | null): ImportPlan[] {
  const seen = new Set(existing.map(holdingSignature).filter(Boolean));
  return incoming.map((row) => {
    const signature = holdingSignature(row);
    if (signature && seen.has(signature)) return { status: "skip" };
    if (currentNav == null || !(currentNav > 0)) {
      return { status: "fail", reason: "No NAV has been saved yet." };
    }
    if (signature) seen.add(signature);
    return { status: "insert", costNav: currentNav };
  });
}

function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
