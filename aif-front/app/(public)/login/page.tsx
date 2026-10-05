import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import DemoCredentials from "@/components/auth/DemoCredentials";
import LoginAside from "@/components/auth/LoginAside";
import LoginForm from "@/components/auth/LoginForm";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/login");

export default function LoginPage() {
  return (
    <>
      <DemoCredentials />
      <AuthCard
        title="Sign in"
        description="Investors can use a mobile number or email. Staff can use their admin email."
        transparent
        aside={<LoginAside />}
      >
        <LoginForm />
      </AuthCard>
    </>
  );
}
