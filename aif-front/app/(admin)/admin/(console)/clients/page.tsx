import type { Metadata } from "next";
import ClientMaster from "@/components/admin/ClientMaster";

export const metadata: Metadata = { title: "Client master" };

export default function ClientsPage() {
  return <ClientMaster />;
}
