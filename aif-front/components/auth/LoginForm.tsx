"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  errorClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/classes";
import { useApp } from "@/context/AppProvider";

export default function LoginForm() {
  const { login, user, ready } = useApp();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace("/dashboard");
    }
  }, [ready, user, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const destination = await login(
      String(form.get("identifier") ?? ""),
      String(form.get("password") ?? ""),
    );
    setPending(false);
    if (destination !== "/dashboard" && destination !== "/admin") {
      setError(destination);
      return;
    }
    router.push(destination);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <label className="block" htmlFor="login-identifier">
        <span className={labelClass}>Mobile or email</span>
        <span className={fieldClass}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#2456c8]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 7h16v10H4z" />
            <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            id="login-identifier"
            name="identifier"
            type="text"
            required
            autoComplete="username"
            inputMode="email"
            className="w-full bg-slate-50 text-sm text-foreground outline-none"
          />
        </span>
      </label>
      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <label className="text-sm font-medium" htmlFor="login-password">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-[#2456c8] hover:underline">
            Forgot password
          </Link>
        </div>
        <span className={fieldClass}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#2456c8]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="6" y="11" width="12" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 1 1 8 0v3" strokeLinecap="round" />
          </svg>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full bg-slate-50 text-sm text-foreground outline-none"
          />
        </span>
      </div>
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={`${primaryButtonClass} h-11 w-full rounded-xl text-sm font-semibold`} disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

const fieldClass =
  "flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#2456c8] focus-within:bg-white";
