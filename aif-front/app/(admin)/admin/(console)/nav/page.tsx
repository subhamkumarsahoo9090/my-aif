import type { Metadata } from "next";
import NavPanel from "@/components/admin/NavPanel";

export const metadata: Metadata = { title: "NAV" };

export default function NavPage() {
  return <NavPanel />;
}
