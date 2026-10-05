import type { Metadata } from "next";
import StatementHistory from "@/components/reports/StatementHistory";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/statements");

export default function StatementsPage() {
  return <StatementHistory />;
}
