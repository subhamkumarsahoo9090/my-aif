import { projectManager } from "@/config/projectmanager";

const items = [
  {
    title: "Support desk",
    text: projectManager.company.phone,
    detail: "Mon–Fri, 9:30 AM – 6:30 PM IST",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 4h3l1.5 3.5-2 1.2a12 12 0 0 0 5 5l1.2-2L20 13v3a2 2 0 0 1-2 2A14 14 0 0 1 4 6a2 2 0 0 1 2-2z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Write to us",
    text: projectManager.company.email,
    detail: "Replies on business days",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 7h16v10H4z" />
        <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Office",
    text: "Express Tower, Sector 62",
    detail: "Noida, UP 201301",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.2" />
      </svg>
    ),
  },
  {
    title: "Your data is safe",
    text: "SEBI Registered",
    detail: "ISO 27001 Certified",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3l7 3v6c0 4.2-2.8 7.4-7 9-4.2-1.6-7-4.8-7-9V6l7-3z" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function LoginHighlights() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <li
          key={item.title}
          className="animate-login-rise flex items-center gap-3 rounded-2xl border border-white bg-white px-4 py-3 text-foreground shadow-[0_10px_28px_rgba(8,24,56,0.16)]"
          style={{ animationDelay: `${520 + index * 80}ms` }}
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EBF2F8] text-[#1B3C6C]">
            {item.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{item.title}</span>
            <span className="mt-0.5 block text-sm font-semibold text-[#1B3C6C]">{item.text}</span>
            <span className="block text-xs text-slate-600">{item.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
