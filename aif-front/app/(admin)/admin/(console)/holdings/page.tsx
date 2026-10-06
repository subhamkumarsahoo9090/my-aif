import type { Metadata } from "next";
import ImportPipeline from "@/components/admin/ImportPipeline";

export const metadata: Metadata = { title: "Add Holding" };

export default function AddHoldingPage() {
  return <ImportPipeline kind="holdings" />;
}
