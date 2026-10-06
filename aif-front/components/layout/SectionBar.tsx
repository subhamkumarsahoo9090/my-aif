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
    <header className="portal-topbar flex shrink-0 flex-col gap-3 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {start}
        {icon ? (
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:inline-flex">{icon}</span>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-xl">{title}</h1>
          <p className="mt-0.5 line-clamp-2 max-w-2xl text-xs leading-5 text-white/80 sm:text-sm lg:line-clamp-none">{description}</p>
        </div>
      </div>
      {end ? <div className="flex shrink-0 items-center justify-end gap-2">{end}</div> : null}
    </header>
  );
}
