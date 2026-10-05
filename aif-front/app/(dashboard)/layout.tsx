import type { ReactNode } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import PageChrome from "@/components/layout/PageChrome";
import SideNav from "@/components/layout/SideNav";
import { brandDisplay } from "@/components/layout/Logo";
import { pageChrome, projectManager } from "@/config/projectmanager";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const brand = {
    name: projectManager.app.name,
    logo: projectManager.app.logo,
    display: brandDisplay(projectManager.app.brandDisplay),
  };

  return (
    <PageChrome
      pages={pageChrome()}
      topNav={<Navbar brand={brand} />}
      sidebar={<SideNav brand={brand} />}
      footer={<Footer />}
    >
      <DashboardShell>{children}</DashboardShell>
    </PageChrome>
  );
}
