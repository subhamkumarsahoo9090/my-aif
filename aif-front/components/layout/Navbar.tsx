"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo, { type BrandDisplay } from "@/components/layout/Logo";
import { primaryButtonClass } from "@/components/ui/classes";
import { useApp } from "@/context/AppProvider";

const links = [{ href: "/", label: "Home" }];

function linkClass(active: boolean) {
  return active
    ? "text-sm font-medium text-primary"
    : "text-sm text-muted hover:text-foreground";
}

export default function Navbar({
  brand,
}: {
  brand: { name: string; logo: string; display: BrandDisplay };
}) {
  const pathname = usePathname();
  const { user, ready } = useApp();
  const onHome = pathname === "/";

  return (
    <header className={onHome ? "bg-transparent" : "border-b border-border bg-background"}>
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="text-foreground">
          <Logo name={brand.name} logo={brand.logo} display={brand.display} />
        </Link>
        <nav className="flex flex-wrap items-center gap-5">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  onHome
                    ? `inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-sm font-semibold text-[#1B3C6C] shadow-[0_4px_16px_rgba(8,24,56,0.18)] ${
                        active ? "underline decoration-2 underline-offset-[6px] decoration-[#2E5FA5]" : ""
                      }`
                    : linkClass(active)
                }
                aria-current={active ? "page" : undefined}
              >
                {onHome ? <HouseIcon /> : null}
                {link.label}
              </Link>
            );
          })}
          {!ready ? (
            <span className="inline-block h-10 w-28" />
          ) : user ? (
            <Link href="/dashboard" className={onHome ? homeLoginClass : primaryButtonClass}>
              {onHome ? <UserIcon /> : null}
              Portal
            </Link>
          ) : (
            <Link href="/login" className={onHome ? homeLoginClass : primaryButtonClass}>
              {onHome ? <UserIcon /> : null}
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

const homeLoginClass =
  "inline-flex items-center gap-2 rounded-full bg-[#2E5FA5] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B3C6C]";

function HouseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.2c1.4-2.6 3.7-3.9 6.5-3.9s5.1 1.3 6.5 3.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
