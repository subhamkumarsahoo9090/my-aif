import type { ReactNode } from "react";

export default function SectionBar({
  title,
  description,
  start,
  icon,
  end,
}: {
  title: string;
  description: string;
  start?: ReactNode;
  icon?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <header className="portal-topbar flex shrink-0 items-center justify-between gap-4 px-4 py-4 text-white md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {start}
        {icon ? (
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">{icon}</span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
          <p className="mt-0.5 max-w-2xl text-sm leading-5 text-white/80">{description}</p>
        </div>
      </div>
      {end}
    </header>
  );
}
