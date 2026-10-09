"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Logo, { type BrandDisplay } from "@/components/layout/Logo";
import SectionBar from "@/components/layout/SectionBar";
import { api, apiFetch, saveSessionToken } from "@/config/endapi";
import type { AdminUser } from "@/lib/types";

const links = [
  { href: "/admin", label: "Dashboard", module: "", icon: "home" },
  { href: "/admin/clients", label: "Client master", module: "clients", icon: "user" },
  { href: "/admin/ledger", label: "Ledger", module: "imports", icon: "list" },
  { href: "/admin/holdings", label: "Add Holding", module: "imports", icon: "grid" },
  { href: "/admin/reports", label: "Reports", module: "reports", icon: "doc" },
  { href: "/admin/nav", label: "NAV", module: "nav", icon: "chart" },
  { href: "/admin/users", label: "Staff directory", module: "users", icon: "users" },
  { href: "/admin/roles", label: "Role matrix", module: "users", icon: "shield" },
  { href: "/admin/audit", label: "Audit trail", module: "audit", icon: "clock" },
  { href: "/admin/schedules", label: "Schedules", module: "schedules", icon: "calendar" },
  { href: "/admin/platform", label: "Platform controls", module: "platform", icon: "settings" },
] as const;

export default function AdminShell({
  children,
  brand,
}: {
  children: ReactNode;
  brand: { name: string; logo: string; display: BrandDisplay };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await apiFetch(api.admin.session);
        const data = (await response.json()) as { user: AdminUser | null };
        if (!active) return;
        setUser(data.user);
        if (!data.user) {
          setReady(true);
          router.replace("/admin/login");
          return;
        }
        const access = await apiFetch(api.admin.access);
        const rights = (await access.json()) as { modules?: Record<string, boolean> };
        if (!active) return;
        setModules(rights.modules ?? {});
        setReady(true);
      } catch {
        if (!active) return;
        setReady(true);
        router.replace("/admin/login");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    await apiFetch(api.auth.logout, { method: "POST" });
    saveSessionToken(null);
    router.replace("/admin/login");
  }

  if (!ready || !user) {
    return <div className="h-dvh bg-[var(--pm-portal-page)]" />;
  }

  const visible = links.filter((link) => !link.module || modules[link.module] !== false);
  const banner = adminBanner(pathname, user.role);

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--pm-portal-page)" }}>
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside
        className={`portal-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-white/10 transition-transform md:static md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 pb-2 pt-4">
          <Link href="/admin" onClick={() => setMenuOpen(false)} className="inline-flex">
            <Logo name={brand.name} logo={brand.logo} display={brand.display} />
          </Link>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            {user.role === "superadmin" ? "Super admin" : "Admin panel"}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {visible.map((link) => {
            const active = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={
                  active
                    ? "flex items-center gap-3 whitespace-nowrap rounded-xl bg-[#F97316] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)]"
                    : "flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] hover:bg-white/15"
                }
                aria-current={active ? "page" : undefined}
              >
                <NavIcon name={link.icon} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <SectionBar
          title={banner.title}
          description={banner.description}
          icon={
            pathname === "/admin"
              ? <HeaderChartIcon />
              : pathname.startsWith("/admin/clients")
                ? <HeaderUserIcon />
                : pathname === "/admin/ledger"
                  ? <HeaderListIcon />
                  : pathname === "/admin/holdings"
                    ? <HeaderGridIcon />
                    : pathname.startsWith("/admin/reports")
                      ? <HeaderDocIcon />
                      : pathname.startsWith("/admin/nav")
                        ? <HeaderChartIcon />
                        : pathname.startsWith("/admin/users")
                          ? <HeaderUsersIcon />
                          : pathname.startsWith("/admin/roles")
                            ? <HeaderShieldIcon />
                            : pathname.startsWith("/admin/audit")
                              ? <HeaderClockIcon />
                              : pathname.startsWith("/admin/schedules")
                                ? <HeaderCalendarIcon />
                                : pathname.startsWith("/admin/platform")
                                  ? <HeaderSettingsIcon />
                                  : undefined
          }
          start={
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-white/15 md:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <span className="block h-0.5 w-4 bg-white" />
              <span className="block h-0.5 w-4 bg-white" />
              <span className="block h-0.5 w-4 bg-white" />
            </button>
          }
          end={
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1B3C6C] shadow-[0_6px_16px_rgba(20,40,70,0.16)]"
                aria-hidden="true"
              >
                <BellIcon />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F97316] ring-2 ring-white" />
              </span>
              <div className="hidden min-w-0 items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3.5 text-[#16324F] shadow-[0_6px_16px_rgba(20,40,70,0.16)] sm:flex">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1B3C6C] text-[11px] font-semibold text-white">
                  {initials(user.name)}
                </span>
                <span className="truncate text-sm font-semibold">
                  {user.role === "superadmin" ? "Super admin" : "Admin"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-2 rounded-full bg-[#1B3C6C] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(20,40,70,0.2)] hover:bg-[#16345F]"
              >
                <LogoutIcon />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          }
        />
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#F4F7FB] px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: (typeof links)[number]["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-[18px] w-[18px] shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    "aria-hidden": true,
  } as const;
  const paths: Record<(typeof links)[number]["icon"], ReactNode> = {
    home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 19.2c1.3-2.7 3.5-4 6.5-4s5.2 1.3 6.5 4" strokeLinecap="round" />
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
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v5h5M8 13h8M8 17h5" strokeLinecap="round" />
      </>
    ),
    chart: (
      <>
        <path d="M5 19V5M5 19h14" strokeLinecap="round" />
        <path d="M8 15v-3M12 15V8M16 15v-5" strokeLinecap="round" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="9" r="2.4" />
        <path d="M4.8 17.5c.8-2 2.4-3 4.2-3s3.4 1 4.2 3" strokeLinecap="round" />
        <circle cx="16" cy="9.5" r="2" />
        <path d="M15.2 14.6c1.5.2 2.8 1 3.6 2.6" strokeLinecap="round" />
      </>
    ),
    shield: <path d="M12 3.5 19 6.2v5.3c0 4-2.8 6.8-7 8.5-4.2-1.7-7-4.5-7-8.5V6.2L12 3.5Z" strokeLinejoin="round" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4.5l3 2" strokeLinecap="round" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3.5v4M16 3.5v4M4 10h16" strokeLinecap="round" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" strokeLinecap="round" />
      </>
    ),
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function HeaderChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 19V5M5 19h14" strokeLinecap="round" />
      <path d="M8 15v-3M12 15V8M16 15v-5" strokeLinecap="round" />
    </svg>
  );
}

function HeaderListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 7h11M8 12h11M8 17h11" strokeLinecap="round" />
      <path d="M4 7h.01M4 12h.01M4 17h.01" strokeLinecap="round" />
    </svg>
  );
}

function HeaderGridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function HeaderSettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" strokeLinecap="round" />
    </svg>
  );
}

function HeaderCalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" strokeLinecap="round" />
    </svg>
  );
}

function HeaderClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" strokeLinecap="round" />
    </svg>
  );
}

function HeaderShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3.5 19 6.2v5.3c0 4-2.8 6.8-7 8.5-4.2-1.7-7-4.5-7-8.5V6.2L12 3.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function HeaderUsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="9" r="2.4" />
      <path d="M4.8 17.5c.8-2 2.4-3 4.2-3s3.4 1 4.2 3" strokeLinecap="round" />
      <circle cx="16" cy="9.5" r="2" />
      <path d="M15.2 14.6c1.5.2 2.8 1 3.6 2.6" strokeLinecap="round" />
    </svg>
  );
}

function HeaderDocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}

function HeaderUserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.2c1.3-2.7 3.5-4 6.5-4s5.2 1.3 6.5 4" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.2 1.5H4.8L6 16.5Z" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 7V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-2" strokeLinejoin="round" />
      <path d="M4 12h10M11 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function adminBanner(pathname: string, role: string) {
  if (pathname === "/admin") {
    return role === "superadmin"
      ? {
          title: "Dashboard",
          description: "Platform value, staff sign-ins, import failures, and high-privilege actions.",
        }
      : {
          title: "Dashboard",
          description: "Operational counts, compliance alerts, recent imports, and statement runs.",
        };
  }
  if (pathname === "/admin/clients/new") {
    return {
      title: "Create Client",
      description: "Onboard an investor with personal, bank, nominee, and PAN details.",
    };
  }
  if (pathname.startsWith("/admin/clients/") && pathname !== "/admin/clients") {
    return {
      title: "Client record",
      description: "Profile, bank, nominee, compliance, holdings, ledger, and audit history.",
    };
  }
  if (pathname.startsWith("/admin/clients")) {
    return {
      title: "Client Master",
      description: "Search investors and open a 360 view of profile, holdings, ledger, and compliance.",
    };
  }
  if (pathname.startsWith("/admin/ledger")) {
    return {
      title: "Ledger",
      description: "Upload a ledger file for a client, then see when each file was saved.",
    };
  }
  if (pathname.startsWith("/admin/holdings")) {
    return {
      title: "Add Holding",
      description: "Upload a holdings file, review the rows, then commit the valid ones.",
    };
  }
  if (pathname.startsWith("/admin/reports")) {
    return {
      title: "Reports and statements",
      description: "Generate a statement now, or schedule daily, weekly, or monthly delivery.",
    };
  }
  if (pathname.startsWith("/admin/nav")) {
    return {
      title: "NAV",
      description: "Add the fund NAV for a date. Clients see units multiplied by the latest NAV.",
    };
  }
  if (pathname.startsWith("/admin/users")) {
    return {
      title: "Staff directory",
      description: "Create, edit, activate, or suspend internal admin accounts.",
    };
  }
  if (pathname.startsWith("/admin/roles")) {
    return {
      title: "Role matrix",
      description: "Super admin keeps full access. Change what the admin role can open.",
    };
  }
  if (pathname.startsWith("/admin/audit")) {
    return {
      title: "Audit trail",
      description: "Filter high-privilege actions by person, action, and the record that changed.",
    };
  }
  if (pathname.startsWith("/admin/schedules")) {
    return {
      title: "Statement schedules",
      description: "Set how often statements go out, who receives them, and how failures are retried.",
    };
  }
  if (pathname.startsWith("/admin/platform")) {
    return {
      title: "Platform controls",
      description: "KRA connection, the security master, and corrected ledger entries.",
    };
  }
  if (pathname.startsWith("/admin/interview")) {
    return {
      title: "Project walkthrough",
      description: "How this part of the portal is built and what it is responsible for.",
    };
  }
  return {
    title: "Admin",
    description: "Fund operations for clients, imports, reports, and platform settings.",
  };
}
