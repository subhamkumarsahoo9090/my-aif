"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import SectionBar from "@/components/layout/SectionBar";
import SessionSecurity from "@/components/session/SessionSecurity";
import { primaryButtonClass } from "@/components/ui/classes";
import { useApp } from "@/context/AppProvider";

const pages: Record<string, { title: string; description: string; tone: string }> = {
  "/dashboard": {
    title: "Dashboard",
    description: "A summary of your fund investments, market valuation, and recent ledger activity.",
    tone: "dashboard",
  },
  "/profile": {
    title: "Profile and compliance",
    description: "Verified investor details, nominee, and regulatory status from the client master record.",
    tone: "profile",
  },
  "/ledger": {
    title: "Ledger",
    description: "Debit and credit entries on your capital account, with a running balance.",
    tone: "ledger",
  },
  "/holdings": {
    title: "Holdings",
    description: "Scheme units currently allotted to your trading code, with cost and market value.",
    tone: "holdings",
  },
  "/statements": {
    title: "Statements",
    description: "Historical investor statements for your account. Download a PDF or open it here.",
    tone: "statements",
  },
};

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { user, ready, sessionExpired, acknowledgeSessionExpiry, logout, sidebarOpen, toggleSidebar } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user && !sessionExpired) {
      router.replace("/login");
    }
  }, [ready, user, sessionExpired, router]);

  if (sessionExpired) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-ended-title"
          className="w-full max-w-md rounded-xl bg-background p-6 shadow-lg"
        >
          <h2 id="session-ended-title" className="text-lg font-semibold">
            Session ended
          </h2>
          <p className="mt-2 text-sm text-muted">
            You were signed out after a period of inactivity.
          </p>
          <button
            type="button"
            className={`${primaryButtonClass} mt-6 w-full`}
            onClick={() => {
              acknowledgeSessionExpiry();
              router.replace("/login");
            }}
          >
            Return to sign in
          </button>
        </div>
      </div>
    );
  }

  if (!ready || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  const page = pages[pathname] ?? pages["/dashboard"];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SessionSecurity />
      <SectionBar
        title={pathname === "/dashboard" ? `Hello, ${user.name}` : page.title}
        description={page.description}
        start={
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-white/15 md:hidden"
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            onClick={toggleSidebar}
          >
            <span className="block h-0.5 w-4 bg-white" />
            <span className="block h-0.5 w-4 bg-white" />
            <span className="block h-0.5 w-4 bg-white" />
          </button>
        }
        icon={
          pathname === "/dashboard" ? <ChartIcon />
          : pathname === "/profile" ? <UserIcon />
          : pathname === "/ledger" ? <ListIcon />
          : pathname === "/holdings" ? <GridIcon />
          : pathname === "/statements" ? <DocIcon />
          : undefined
        }
        end={
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/15 py-1.5 pl-1.5 pr-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xs font-semibold text-white">
                {initials(user.name)}
              </span>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-white/75">{user.clientCode}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void logout("manual").then(() => router.replace("/login"));
              }}
              className="rounded-full border border-white/35 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 sm:px-4"
            >
              Log out
            </button>
          </div>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F7FB] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6">
        {children}
      </div>
    </div>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5M8 12h8M8 16h6" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 7h12M8 12h12M8 17h12" strokeLinecap="round" />
      <circle cx="4.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.2c1.3-2.7 3.5-4 6.5-4s5.2 1.3 6.5 4" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M7 15l4-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
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
