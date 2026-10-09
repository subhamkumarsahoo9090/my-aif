"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const { user, logout, sidebarOpen, setSidebarOpen } = useApp();

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
        className={`portal-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-white/10 transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="shrink-0 px-4 py-4">
          <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className="inline-flex">
            <Logo name={brand.name} logo={brand.logo} display={brand.display} />
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3">
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
                    : "flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] hover:bg-white/15"
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
        {user ? (
          <div className="shrink-0 border-t border-white/10 p-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/15 py-2 pl-2 pr-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xs font-semibold text-white">
                {initials(user.name)}
              </span>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-white/75">{user.clientCode}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                void logout("manual").then(() => router.replace("/login"));
              }}
              className="mt-2 w-full rounded-full border border-white/35 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Log out
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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
