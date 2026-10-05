import type { ReactNode } from "react";

export default function PageHeader({
  eyebrow = "Admin",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section
      className="mb-6 flex flex-col gap-4 overflow-hidden rounded-3xl px-6 py-6 text-[var(--pm-banner-text)] shadow-[0_16px_40px_rgba(9,28,55,0.22)] sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "linear-gradient(90deg, var(--pm-banner-from), var(--pm-banner-via), var(--pm-banner-to))" }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">{description}</p>
      </div>
      {action}
    </section>
  );
}
