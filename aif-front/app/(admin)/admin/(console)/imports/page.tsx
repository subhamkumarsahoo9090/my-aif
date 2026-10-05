import type { Metadata } from "next";
import ImportPipeline from "@/components/admin/ImportPipeline";

export const metadata: Metadata = { title: "Imports" };

export default function ImportsPage() {
  return <ImportPipeline />;
}
