import type { Metadata } from "next";
import HoldingsTable from "@/components/holdings/HoldingsTable";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/holdings");

export default function HoldingsPage() {
  return <HoldingsTable />;
}
