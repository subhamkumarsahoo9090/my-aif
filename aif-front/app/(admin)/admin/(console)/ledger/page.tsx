import type { Metadata } from "next";
import ImportPipeline from "@/components/admin/ImportPipeline";

export const metadata: Metadata = { title: "Ledger" };

export default function LedgerImportPage() {
  return <ImportPipeline kind="ledger" />;
}
