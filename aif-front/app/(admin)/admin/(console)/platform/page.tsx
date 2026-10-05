import type { Metadata } from "next";
import PlatformControls from "@/components/admin/PlatformControls";

export const metadata: Metadata = { title: "Platform controls" };

export default function PlatformPage() {
  return <PlatformControls />;
}
