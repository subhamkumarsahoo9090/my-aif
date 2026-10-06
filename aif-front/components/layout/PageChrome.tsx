"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type PageFlags = {
  showTopNav: boolean;
  showSidebar: boolean;
  showFooter: boolean;
};

export default function PageChrome({
  pages,
  topNav,
  sidebar,
  footer,
  children,
}: {
  pages: Record<string, PageFlags>;
  topNav: ReactNode;
  sidebar: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const page = pages[pathname];
  const showTopNav = page ? page.showTopNav : true;
  const showSidebar = page ? page.showSidebar : false;
  const showFooter = page ? page.showFooter : true;
  const homeBackground = pathname === "/";
  const loginBackground = pathname === "/login";

  const frame = (
    <>
      {showTopNav ? topNav : null}
      <div className="flex min-h-0 flex-1">
        {showSidebar ? sidebar : null}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </>
  );

  if (showSidebar && !homeBackground && !loginBackground) {
    return (
      <div className="flex h-dvh overflow-hidden">
        {sidebar}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={
        homeBackground
          ? "flex h-auto min-h-dvh flex-col md:h-dvh md:overflow-hidden"
          : "flex min-h-full flex-1 flex-col"
      }
    >
      {homeBackground ? (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <img
            src="/backt.png"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,28,64,0.38)_0%,rgba(8,28,64,0.16)_34%,transparent_62%)]" />
          <div className="relative flex min-h-0 flex-1 flex-col">{frame}</div>
        </div>
      ) : loginBackground ? (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <img
            src="/backp.png"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(52,106,165,0.28)_0%,rgba(198,218,244,0.08)_48%,rgba(253,209,162,0.16)_100%)]" />
          <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">{frame}</div>
        </div>
      ) : (
        frame
      )}
      {showFooter ? (
        homeBackground ? (
          <div className="shrink-0 [&_.footer-bar]:py-2 [&_.footer-blurb]:mt-2 [&_.footer-blurb]:text-xs [&_.footer-blurb]:leading-5 [&_.footer-grid]:gap-4 [&_.footer-grid]:px-6 [&_.footer-grid]:py-3 [&_.footer-grid]:lg:gap-6 [&_.footer-grid]:lg:py-3 [&_.footer-links]:mt-2 [&_.footer-links]:gap-1.5 [&_.footer-social]:mt-2 [&_footer]:mt-0">
            {footer}
          </div>
        ) : (
          footer
        )
      ) : null}
    </div>
  );
}
