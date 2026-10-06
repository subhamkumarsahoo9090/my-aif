const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const quantityFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export function formatInr(value: number) {
  return inr.format(value);
}

export function formatInrPlain(value: number) {
  const sign = value < 0 ? "-" : "";
  return `INR ${sign}${plain.format(Math.abs(value))}`;
}

export function formatPnl(value: number) {
  if (value > 0) return `+${formatInr(value)}`;
  return formatInr(value);
}

export function formatQuantity(value: number) {
  return quantityFormat.format(value);
}

export function formatNav(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatDob(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
