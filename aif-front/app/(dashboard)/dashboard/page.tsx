import type { Metadata } from "next";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/dashboard");

export default function DashboardPage() {
  return <ClientDashboard />;
}
