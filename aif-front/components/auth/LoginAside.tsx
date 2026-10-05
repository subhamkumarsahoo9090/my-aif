import TypedHeadline from "@/components/auth/TypedHeadline";

const points = [
  {
    title: "Portfolio value",
    text: "See what your account is worth, in one place.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 19V5M4 19h16" strokeLinecap="round" />
        <path d="M7 15l4-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Ledger and holdings",
    text: "Follow capital movements and the units you hold.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M7 4h10a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        <path d="M9 9h6M9 13h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Statements",
    text: "Open the reports issued for your account.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 3h6l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Private to you",
    text: "Each sign-in opens only that investor’s records.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 11V8a4 4 0 1 1 8 0v3" strokeLinecap="round" />
        <rect x="6" y="11" width="12" height="9" rx="2" />
      </svg>
    ),
  },
];

export default function LoginAside() {
  return (
    <section className="w-full max-w-xl text-white">
      <p className="animate-login-rise text-xs font-semibold uppercase tracking-[0.22em] text-white drop-shadow-[0_2px_8px_rgba(6,22,52,0.7)]">
        Client portal
      </p>
      <TypedHeadline
        text="A clearer view of your investments."
        className="mt-3 min-h-[2.5em] text-4xl font-semibold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(6,22,52,0.75)] sm:text-5xl"
      />
      <p className="animate-login-rise mt-4 max-w-md text-base leading-relaxed text-white drop-shadow-[0_2px_10px_rgba(6,22,52,0.7)] [animation-delay:160ms]">
        Sign in to review portfolio value, capital movements, holdings, and statements for your own account.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {points.map((point, index) => (
          <li
            key={point.title}
            className="animate-login-rise flex gap-3 rounded-2xl border border-white bg-white p-3 text-foreground shadow-[0_10px_28px_rgba(8,24,56,0.18)]"
            style={{ animationDelay: `${240 + index * 90}ms` }}
          >
            <span className="animate-login-float mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBF2F8] text-[#1B3C6C]">
              {point.icon}
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#1B3C6C]">{point.title}</span>
              <span className="mt-0.5 block text-sm text-slate-600">{point.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
