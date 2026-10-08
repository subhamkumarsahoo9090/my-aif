import AuthCard from "@/components/auth/AuthCard";
import DemoCredentials from "@/components/auth/DemoCredentials";
import LoginAside from "@/components/auth/LoginAside";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginScreen() {
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
