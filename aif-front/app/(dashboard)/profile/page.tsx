import type { Metadata } from "next";
import ProfileCard from "@/components/profile/ProfileCard";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/profile");

export default function ProfilePage() {
  return <ProfileCard />;
}
