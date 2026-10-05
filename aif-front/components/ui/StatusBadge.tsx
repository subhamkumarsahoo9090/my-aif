import type { ReactNode } from "react";

const tones = {
  success: "bg-[var(--pm-badge-success-bg)] text-[var(--pm-badge-success-color)]",
  warning: "bg-[var(--pm-badge-warning-bg)] text-[var(--pm-badge-warning-color)]",
  danger: "bg-[var(--pm-badge-danger-bg)] text-[var(--pm-badge-danger-color)]",
  neutral: "bg-[var(--pm-badge-neutral-bg)] text-[var(--pm-badge-neutral-color)]",
};

export default function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof tones;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
