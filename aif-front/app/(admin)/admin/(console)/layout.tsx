import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { brandDisplay } from "@/components/layout/Logo";
import { projectManager } from "@/config/projectmanager";

export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell
      brand={{
        name: projectManager.app.name,
        logo: projectManager.app.logo,
        display: brandDisplay(projectManager.app.brandDisplay),
      }}
    >
      {children}
    </AdminShell>
  );
}
