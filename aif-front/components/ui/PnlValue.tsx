import { formatPnl } from "@/lib/format";
import StatusBadge from "@/components/ui/StatusBadge";

export default function PnlValue({ value }: { value: number }) {
  const tone = value > 0 ? "success" : value < 0 ? "danger" : "neutral";
  const label = value > 0 ? "Profit" : value < 0 ? "Loss" : "Flat";
  const color =
    value > 0
      ? "text-[var(--pm-badge-success-color)]"
      : value < 0
        ? "text-[var(--pm-badge-danger-color)]"
        : "text-muted";

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`font-medium tabular-nums ${color}`}>{formatPnl(value)}</span>
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </span>
  );
}
