import type { Metadata } from "next";
import ReportsPanel from "@/components/admin/ReportsPanel";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return <ReportsPanel />;
}
