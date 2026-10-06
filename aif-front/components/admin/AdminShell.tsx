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
  { href: "/admin", label: "Dashboard", module: "" },
  { href: "/admin/clients", label: "Client master", module: "clients" },
  { href: "/admin/imports", label: "Imports", module: "imports" },
  { href: "/admin/reports", label: "Reports", module: "reports" },
  { href: "/admin/nav", label: "NAV", module: "nav" },
  { href: "/admin/users", label: "Staff directory", module: "users" },
  { href: "/admin/roles", label: "Role matrix", module: "users" },
  { href: "/admin/audit", label: "Audit trail", module: "audit" },
  { href: "/admin/schedules", label: "Schedules", module: "schedules" },
  { href: "/admin/platform", label: "Platform controls", module: "platform" },
];

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
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-border text-[var(--pm-portal-sidebar-text)] transition-transform md:static md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "linear-gradient(180deg, var(--pm-portal-sidebar) 0%, var(--pm-portal-sidebar-end) 100%)",
        }}
      >
        <div className="px-4 py-4">
          <Link href="/admin" onClick={() => setMenuOpen(false)} className="inline-flex">
            <Logo name={brand.name} logo={brand.logo} display={brand.display} />
          </Link>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--pm-portal-sidebar-muted)]">
            {user.role === "superadmin" ? "Super admin" : "Admin panel"}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {visible.map((link) => {
            const label = link.href === "/admin" && user.role === "superadmin" ? "Command center" : link.label;
            const active = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={
                  active
                    ? "rounded-xl px-3 py-2 text-sm font-semibold"
                    : "rounded-xl px-3 py-2 text-sm text-[var(--pm-portal-sidebar-text)] hover:bg-[var(--pm-portal-page)]"
                }
                style={
                  active
                    ? { background: "var(--pm-nav-dashboard-bg)", color: "var(--pm-nav-dashboard-color)" }
                    : undefined
                }
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <SectionBar
          title={banner.title}
          description={banner.description}
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
              <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/15 py-1.5 pl-1.5 pr-3">
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, var(--pm-banner-from), var(--pm-banner-to))" }}
                >
                  {initials(user.name)}
                </span>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-white/75">{user.role === "superadmin" ? "Super admin" : "Admin"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-xl bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25"
              >
                Log out
              </button>
            </div>
          }
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
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
          title: "Command center",
          description: "Platform value, staff sign-ins, import failures, and high-privilege actions.",
        }
      : {
          title: "Admin dashboard",
          description: "Operational counts, compliance alerts, recent imports, and statement runs.",
        };
  }
  if (pathname === "/admin/clients/new") {
    return {
      title: "Create client",
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
      title: "Client master",
      description: "Search investors and open a 360 view of profile, holdings, ledger, and compliance.",
    };
  }
  if (pathname.startsWith("/admin/imports")) {
    return {
      title: "CSV import",
      description: "Upload a ledger or holdings file, review the rows, then commit the valid ones.",
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
