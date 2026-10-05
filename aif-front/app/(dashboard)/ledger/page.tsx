import type { Metadata } from "next";
import LedgerTable from "@/components/ledger/LedgerTable";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/ledger");

export default function LedgerPage() {
  return <LedgerTable />;
}
