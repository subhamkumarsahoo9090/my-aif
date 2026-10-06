import type { ReactNode } from "react";
import Link from "next/link";
import { brandDisplay } from "@/components/layout/Logo";
import { projectManager } from "@/config/projectmanager";
import { footerLogoSrc } from "@/lib/footer-logo";

const quickLinks = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/login", label: "Sign in", icon: "user" },
  { href: "/privacy", label: "Privacy Policy", icon: "shield" },
  { href: "/terms", label: "Terms & Conditions", icon: "file" },
] as const;

const portfolioLinks = [
  { href: "/dashboard", label: "Portfolio Snapshot", icon: "chart" },
  { href: "/holdings", label: "Holdings", icon: "grid" },
  { href: "/ledger", label: "Ledger & Transactions", icon: "list" },
  { href: "/statements", label: "Statement & Compliance", icon: "doc" },
] as const;

export default async function Footer() {
  const { app, company } = projectManager;
  const year = new Date().getFullYear();
  const display = brandDisplay(app.brandDisplay);
  const showLogo = display === "logo" || display === "both";
  const showName = display === "name" || display === "both";
  const logoSrc = showLogo ? await footerLogoSrc(app.logo) : null;

  return (
    <footer className="mt-auto w-full font-sans">
      <div className="relative w-full overflow-hidden text-white">
        <img
          src="/footerbg.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#071833]/78 via-[#0c2748]/62 to-[#16375c]/48" />

        <div className="footer-grid relative grid gap-10 px-6 py-9 sm:px-8 lg:grid-cols-4 lg:gap-8 lg:px-10 lg:py-10">
          <div>
            <span className="inline-flex items-center gap-2 font-semibold">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={showName ? "" : app.name}
                  width={270}
                  height={91}
                  className="max-w-none"
                  style={{
                    height: "calc(2.65rem * 1.4641)",
                    width: "calc(2.65rem * 1.4641 * 270 / 91)",
                  }}
                />
              ) : null}
              {showName ? <span>{app.name}</span> : null}
            </span>
            <p className="footer-blurb mt-5 max-w-[220px] text-sm leading-6 text-white/75">
              Your trusted partner in wealth management. Secure. Transparent. Always with you.
            </p>
            <div className="footer-social mt-5 flex gap-2.5">
              <Social label="LinkedIn">
                <LinkedInIcon />
              </Social>
              <Social label="X">
                <XIcon />
              </Social>
              <Social label="YouTube">
                <YouTubeIcon />
              </Social>
              <Social label="Instagram">
                <InstagramIcon />
              </Social>
            </div>
          </div>

          <FooterColumn title="Quick links">
            {quickLinks.map((link) => (
              <FooterLink key={link.label} href={link.href} icon={link.icon}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Portfolio">
            {portfolioLinks.map((link) => (
              <FooterLink key={link.label} href={link.href} icon={link.icon}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Contact">
            <p className="text-sm font-medium text-white">Wealth Discovery Capital</p>
            <ContactRow icon="pin">{company.address}</ContactRow>
            <ContactRow icon="phone" href={`tel:${company.phone}`}>
              {company.phone}
            </ContactRow>
            <ContactRow icon="mail" href={`mailto:${company.email}`}>
              {company.email}
            </ContactRow>
            <ContactRow icon="clock">Mon – Fri / 9:30 AM – 6:30 PM (IST)</ContactRow>
          </FooterColumn>
        </div>

        <div className="footer-bar relative flex flex-col gap-3 border-t border-white/15 px-6 py-4 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>© {year} Wealth Discovery Capital. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[#3ddc97]">
              <ShieldIcon />
              Your data is safe with us
            </span>
            <Dot />
            <span>SEBI Registered</span>
            <Dot />
            <span>ISO 27001 Certified</span>
            <Dot />
            <a href="https://techculture.ai/" target="_blank" rel="noreferrer" className="hover:text-white">
              Powered by TechCulture
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-white">{title}</h2>
      <span className="mt-2 block h-[3px] w-8 rounded-full bg-[#3ddc97]" />
      <div className="footer-links mt-4 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FooterLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 text-sm text-white/85 hover:text-white">
      <RowIcon name={icon} />
      {children}
    </Link>
  );
}

function ContactRow({
  icon,
  href,
  children,
}: {
  icon: string;
  href?: string;
  children: ReactNode;
}) {
  const className = "inline-flex items-start gap-2.5 text-sm leading-5 text-white/80 hover:text-white";
  const body = (
    <>
      <span className="mt-0.5 text-white/80">
        <RowIcon name={icon} />
      </span>
      <span className="whitespace-pre-line">{children}</span>
    </>
  );

  if (href) {
    return (
      <a className={className} href={href}>
        {body}
      </a>
    );
  }

  return <p className={className}>{body}</p>;
}

function Social({ label, children }: { label: string; children: ReactNode }) {
  return (
    <a
      href={`#${label.toLowerCase()}`}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/35 text-white/90 hover:border-white hover:text-white"
    >
      {children}
    </a>
  );
}

function Dot() {
  return <span className="text-white/35" aria-hidden="true">•</span>;
}

function RowIcon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5.5 19.2c1.4-2.6 3.7-3.9 6.5-3.9s5.1 1.3 6.5 3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "shield") {
    return <ShieldIcon />;
  }
  if (name === "file" || name === "doc") {
    return (
      <svg {...common}>
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V10M10 19V5M16 19v-7M21 19H3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "grid") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg {...common}>
        <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "pin") {
    return (
      <svg {...common}>
        <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M8 3h3l1.5 4-2 1.2a12 12 0 0 0 5.3 5.3L17 12l4 1.5V17a2 2 0 0 1-2.2 2A16 16 0 0 1 5 6.2 2 2 0 0 1 7 4h1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "mail") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.5 9H4V20h2.5V9ZM5.2 4A1.6 1.6 0 1 0 5.2 7.2 1.6 1.6 0 0 0 5.2 4ZM20 20h-2.5v-5.6c0-1.6-.6-2.6-2-2.6-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V20H11V9h2.4v1.5c.4-.7 1.3-1.8 3.2-1.8 2.3 0 4 1.5 4 4.8V20Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.6 3H20.4l-6.7 7.7L21.5 21h-5.6l-4.4-5.8L6.4 21H3.6l7.2-8.2L2.8 3h5.7l4 5.3L17.6 3Zm-1 16.2h1.6L7.5 4.7H5.8l10.8 14.5Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C18.2 5.4 12 5.4 12 5.4s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 9 2 12.2 2 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6ZM10 15.5v-6.6l5.2 3.3-5.2 3.3Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" />
    </svg>
  );
}
