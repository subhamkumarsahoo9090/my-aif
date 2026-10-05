import type { Metadata } from "next";
import Link from "next/link";
import TypedHeadline from "@/components/auth/TypedHeadline";
import HomeActions from "@/components/home/HomeActions";
import { pageMetadata, projectManager } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/");

const points = [
  {
    title: "Portfolio snapshot",
    body: "See invested capital, current valuation, and realized and unrealized profit or loss.",
    href: "/dashboard",
    icon: "chart",
    card: "bg-[#e7f2ff]",
    wave: "#c5ddfb",
    iconWrap: "bg-[#d4e6ff] text-[#2f6bdc]",
    button: "bg-[#2f6bdc]",
  },
  {
    title: "Ledger and holdings",
    body: "Filter capital-account entries, export them, and review scheme units.",
    href: "/ledger",
    icon: "list",
    card: "bg-[#fff4e3]",
    wave: "#f3ddb4",
    iconWrap: "bg-[#f6e4bf] text-[#c98412]",
    button: "bg-[#f0a01a]",
  },
  {
    title: "Statement and compliance",
    body: "Download investor statements and check KRA and FATCA status on your portfolio.",
    href: "/statements",
    icon: "doc",
    card: "bg-[#f3ecff]",
    wave: "#ddccfb",
    iconWrap: "bg-[#e6d8ff] text-[#7a45d4]",
    button: "bg-[#7a45d4]",
  },
] as const;

export default function HomePage() {
  const { app } = projectManager;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex w-full flex-1 flex-col px-6 pb-4 pt-3 sm:px-8 sm:pt-4 lg:px-10">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-white drop-shadow-[0_1px_6px_rgba(8,24,56,0.55)]">
            AIF CLIENT PORTAL <span aria-hidden="true">—</span>
          </p>
          <TypedHeadline
            as="h1"
            text="Your fund investments, in one private view."
            className="mt-2 max-w-xl min-h-[2.4em] text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_14px_rgba(8,24,56,0.5)] sm:text-4xl"
          />
          <p className="mt-2 max-w-lg text-sm leading-5 text-white/90 drop-shadow-[0_1px_8px_rgba(8,24,56,0.55)]">
            {app.description} Sign in to open only your own account. Follow capital movements and the units you hold, then download the statements issued for you.
          </p>
          <HomeActions />
        </div>
        <ul className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-3">
          {points.map((point) => (
            <li
              key={point.title}
              className={`relative flex overflow-hidden rounded-2xl shadow-[0_8px_18px_rgba(20,50,90,0.08)] ${point.card}`}
            >
              <CardWave fill={point.wave} />
              <div className="relative flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-3 pr-11">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${point.iconWrap}`}
                  >
                    <CardIcon name={point.icon} />
                  </span>
                  <h2 className="text-[13px] font-semibold leading-4 text-[#1b3f86]">
                    {point.title}
                  </h2>
                </div>
                <p className="text-[11px] leading-[1.35] text-[#4b5563]">{point.body}</p>
              </div>
              <Link
                href={point.href}
                aria-label={point.title}
                className={`absolute right-2 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm ${point.button}`}
              >
                <ArrowIcon />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CardWave({ fill }: { fill: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[46%]"
      viewBox="0 0 240 140"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M48 140C92 108 36 62 108 28C146 10 176 0 240 0V140H48Z"
        fill={fill}
      />
    </svg>
  );
}

function CardIcon({ name }: { name: "chart" | "list" | "doc" }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };

  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "list") {
    return (
      <svg {...common}>
        <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 3v5h5M8 13h8M8 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
