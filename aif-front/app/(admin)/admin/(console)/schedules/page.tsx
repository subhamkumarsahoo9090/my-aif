import type { Metadata } from "next";
import ScheduleManager from "@/components/admin/ScheduleManager";

export const metadata: Metadata = { title: "Statement schedules" };

export default function SchedulesPage() {
  return <ScheduleManager />;
}
