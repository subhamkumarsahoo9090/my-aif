import PageHeader from "@/components/ui/PageHeader";
import type { InterviewTopic as Topic } from "@/lib/interview-topics";

export default function InterviewTopic({ topic }: { topic: Topic }) {
  return (
    <div className="w-full">
      <PageHeader eyebrow="Interview" title={topic.label} description={topic.summary} />
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-white p-5 shadow-[0_10px_24px_rgba(20,50,90,0.05)]">
          <h2 className="text-sm font-semibold">In this project</h2>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-foreground">
            {topic.here.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl bg-[var(--pm-card-mint-bg)] p-5 text-[var(--pm-card-mint-color)]">
          <h2 className="text-sm font-semibold">What you can say</h2>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6">
            {topic.canDo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
