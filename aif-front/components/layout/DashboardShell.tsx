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
  const { user, ready, sessionExpired, acknowledgeSessionExpiry, logout } = useApp();
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
                <p className="truncate text-xs text-white/75">{user.clientCode}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void logout("manual").then(() => router.replace("/login"));
              }}
              className="rounded-xl bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25"
            >
              Log out
            </button>
          </div>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6" style={{ background: "var(--pm-portal-page)" }}>
        {children}
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
