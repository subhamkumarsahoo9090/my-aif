import type { Metadata } from "next";
import LoginScreen from "@/components/auth/LoginScreen";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/login");

export default function LoginPage() {
  return <LoginScreen />;
}
