import Link from "next/link";
import { projectManager } from "@/config/projectmanager";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  points?: string[];
};

export default function LegalDocument({
  kicker,
  title,
  intro,
  updated,
  sections,
  otherHref,
  otherLabel,
}: {
  kicker: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
  otherHref: string;
  otherLabel: string;
}) {
  const { company } = projectManager;

  return (
    <div className="bg-[#F4F7FB]">
      <header className="bg-[#1B3C6C] px-6 py-10 text-white sm:px-8 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{kicker}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">{intro}</p>
        <p className="mt-4 text-xs text-white/70">Last updated {updated}</p>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[240px_1fr] lg:px-10">
        <nav className="h-fit rounded-2xl border border-[#E6EDF5] bg-white p-4 shadow-[0_8px_24px_rgba(20,50,90,0.05)] lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7B8794]">On this page</p>
          <ol className="mt-3 space-y-1">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="flex gap-2 rounded-lg px-2 py-1.5 text-sm text-[#1B3C6C] hover:bg-[#F4F7FB]">
                  <span className="w-5 shrink-0 text-[#F97316]">{index + 1}.</span>
                  <span>{section.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-4">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-6 rounded-2xl border border-[#E6EDF5] bg-white p-5 shadow-[0_8px_24px_rgba(20,50,90,0.05)] sm:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F0FF] text-sm font-semibold text-[#1D4E89]">
                  {index + 1}
                </span>
                <h2 className="pt-1 text-lg font-semibold text-[#16324F]">{section.title}</h2>
              </div>
              <div className="mt-4 space-y-3 pl-0 sm:pl-11">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-6 text-[#3D4C5E]">{paragraph}</p>
                ))}
                {section.points ? (
                  <ul className="space-y-2">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-2 text-sm leading-6 text-[#3D4C5E]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F97316]" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-[#E6EDF5] bg-white p-5 shadow-[0_8px_24px_rgba(20,50,90,0.05)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#16324F]">Contact</h2>
            <p className="mt-3 text-sm leading-6 text-[#3D4C5E]">
              Questions about these terms or about the information on your account can be sent to the fund office.
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-[#7B8794]">Office</dt>
                <dd className="mt-1 font-medium text-[#16324F]">{company.name}</dd>
                <dd className="mt-1 whitespace-pre-line text-[#3D4C5E]">{company.address}</dd>
              </div>
              <div className="rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-[#7B8794]">Reach us</dt>
                <dd className="mt-1">
                  <a className="font-medium text-[#F97316] hover:text-[#EA6C0C]" href={`mailto:${company.email}`}>{company.email}</a>
                </dd>
                <dd className="mt-1 text-[#3D4C5E]">{company.phone}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-[#3D4C5E]">
              Also read the <Link href={otherHref} className="font-semibold text-[#F97316] hover:text-[#EA6C0C]">{otherLabel}</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
