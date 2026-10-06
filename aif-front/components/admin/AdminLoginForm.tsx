"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiFetch, saveSessionToken } from "@/config/endapi";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui/classes";

export default function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await apiFetch(api.admin.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; token?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.message ?? "Sign in failed.");
      return;
    }
    if (data.token) saveSessionToken(data.token);
    router.push("/admin");
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <label className="text-sm">
        <span className={labelClass}>Email</span>
        <input name="email" type="email" required autoComplete="username" className={inputClass} />
      </label>
      <label className="text-sm">
        <span className={labelClass}>Password</span>
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" className={primaryButtonClass} disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
