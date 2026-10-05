"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Logo, { type BrandDisplay } from "@/components/layout/Logo";
import { useApp } from "@/context/AppProvider";

const links = [
  { href: "/dashboard", label: "Dashboard", tone: "dashboard", icon: "chart" },
  { href: "/profile", label: "Profile", tone: "profile", icon: "user" },
  { href: "/ledger", label: "Ledger", tone: "ledger", icon: "list" },
  { href: "/holdings", label: "Holdings", tone: "holdings", icon: "grid" },
  { href: "/statements", label: "Statements", tone: "statements", icon: "doc" },
] as const;

export default function SideNav({
  brand,
}: {
  brand: { name: string; logo: string; display: BrandDisplay };
}) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useApp();

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-border text-[var(--pm-portal-sidebar-text)] transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "linear-gradient(180deg, var(--pm-portal-sidebar) 0%, var(--pm-portal-sidebar-end) 100%)",
        }}
      >
        <div className="px-4 py-4">
          <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="inline-flex">
            <Logo name={brand.name} logo={brand.logo} display={brand.display} />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setSidebarOpen(false)}
                className={
                  active
                    ? "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold"
                    : "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--pm-portal-sidebar-text)] hover:bg-[var(--pm-portal-page)]"
                }
                style={
                  active
                    ? {
                        background: `var(--pm-nav-${link.tone}-bg)`,
                        color: `var(--pm-nav-${link.tone}-color)`,
                      }
                    : undefined
                }
              >
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: `var(--pm-nav-${link.tone}-bg)`,
                    color: `var(--pm-nav-${link.tone}-color)`,
                  }}
                >
                  <NavIcon name={link.icon} />
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function NavIcon({ name }: { name: "chart" | "user" | "list" | "grid" | "doc" }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    "aria-hidden": true,
  } as const;
  const paths: Record<typeof name, ReactNode> = {
    chart: (
      <>
        <path d="M4 19V5M4 19h16" strokeLinecap="round" />
        <path d="M7 15l4-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" strokeLinecap="round" />
      </>
    ),
    list: (
      <>
        <path d="M8 7h11M8 12h11M8 17h11" strokeLinecap="round" />
        <path d="M4 7h.01M4 12h.01M4 17h.01" strokeLinecap="round" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    doc: (
      <>
        <path d="M8 3h6l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
      </>
    ),
  };
  return <svg {...common}>{paths[name]}</svg>;
}
