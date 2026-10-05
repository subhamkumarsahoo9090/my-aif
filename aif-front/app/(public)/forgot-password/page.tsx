import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/forgot-password");

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      description="Confirm the mobile number or email on the account, then enter the verification code."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
