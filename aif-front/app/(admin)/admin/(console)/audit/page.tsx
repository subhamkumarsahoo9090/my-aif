import type { Metadata } from "next";
import AuditPanel from "@/components/admin/AuditPanel";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditPage() {
  return <AuditPanel />;
}
