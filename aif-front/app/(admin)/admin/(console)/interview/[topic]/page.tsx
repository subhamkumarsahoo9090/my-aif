import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InterviewTopic from "@/components/admin/InterviewTopic";
import { interviewTopic, interviewTopics } from "@/lib/interview-topics";

export function generateStaticParams() {
  return interviewTopics.map((topic) => ({ topic: topic.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic: id } = await params;
  const topic = interviewTopic(id);
  return { title: topic ? `${topic.label} · Interview` : "Interview" };
}

export default async function InterviewTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic: id } = await params;
  const topic = interviewTopic(id);
  if (!topic) notFound();
  return <InterviewTopic topic={topic} />;
}
