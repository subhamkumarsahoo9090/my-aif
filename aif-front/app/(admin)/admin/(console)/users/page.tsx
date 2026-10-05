import type { Metadata } from "next";
import StaffPanel from "@/components/admin/StaffPanel";

export const metadata: Metadata = { title: "Staff directory" };

export default function UsersPage() {
  return <StaffPanel />;
}
