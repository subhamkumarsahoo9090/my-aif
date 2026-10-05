import type { Metadata } from "next";
import RoleMatrix from "@/components/admin/RoleMatrix";

export const metadata: Metadata = { title: "Role matrix" };

export default function RolesPage() {
  return <RoleMatrix />;
}
