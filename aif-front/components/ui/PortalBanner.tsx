export default function PortalBanner({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section
      className="mb-6 overflow-hidden rounded-3xl px-6 py-6 text-[var(--pm-banner-text)] shadow-[0_16px_40px_rgba(9,28,55,0.22)]"
      style={{ background: "linear-gradient(90deg, var(--pm-banner-from), var(--pm-banner-via), var(--pm-banner-to))" }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">{description}</p>
    </section>
  );
}
