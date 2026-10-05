import type { ReactNode } from "react";

export default function SectionBar({
  title,
  description,
  start,
  end,
}: {
  title: string;
  description: string;
  start?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <header
      className="flex shrink-0 items-center justify-between gap-4 px-4 py-5 text-white shadow-[0_16px_40px_rgba(79,70,229,0.22)] md:px-6"
      style={{ background: "linear-gradient(90deg, var(--pm-banner-from), var(--pm-banner-via), var(--pm-banner-to))" }}
    >
      <div className="flex min-w-0 items-start gap-3">
        {start}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-white/85">{description}</p>
        </div>
      </div>
      {end}
    </header>
  );
}
