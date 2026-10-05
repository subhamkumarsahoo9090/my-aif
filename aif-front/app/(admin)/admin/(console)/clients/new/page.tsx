import type { Metadata } from "next";
import ClientForm from "@/components/admin/ClientForm";

export const metadata: Metadata = { title: "Create client" };

export default function NewClientPage() {
  return <ClientForm />;
}
