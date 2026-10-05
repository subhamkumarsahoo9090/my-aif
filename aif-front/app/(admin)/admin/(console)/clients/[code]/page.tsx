import type { Metadata } from "next";
import Client360 from "@/components/admin/Client360";

export const metadata: Metadata = { title: "Client 360" };

export default async function ClientRecordPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <Client360 code={code} />;
}
