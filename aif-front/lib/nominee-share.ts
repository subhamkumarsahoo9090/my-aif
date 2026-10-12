type ShareNominee = { share?: string };

export function shareCents(value: string | undefined): number {
  const cleaned = (value ?? "").trim().replace(/%/g, "");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return 0;
  return Math.round(Number(cleaned) * 100);
}

export function formatShareCents(cents: number): string {
  const safe = Math.max(0, Math.round(cents));
  const whole = Math.floor(safe / 100);
  const fraction = safe % 100;
  if (fraction === 0) return String(whole);
  if (fraction % 10 === 0) return `${whole}.${fraction / 10}`;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

export function nomineeShareTotalCents(nominees: ShareNominee[]): number {
  return nominees.reduce((sum, nominee) => sum + shareCents(nominee.share), 0);
}
