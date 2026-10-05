"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  errorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/classes";
import { useApp } from "@/context/AppProvider";
import { api, apiFetch } from "@/config/endapi";
import { passwordError } from "@/lib/password";

type Step = "identify" | "otp" | "reset" | "done";

export default function ForgotPasswordForm() {
  const { user, ready } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>("identify");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");

  useEffect(() => {
    if (ready && user) {
      router.replace("/dashboard");
    }
  }, [ready, user, router]);

  async function post(url: string, body: object) {
    const response = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      demoCode?: string;
    };
    return { ok: response.ok, data };
  }

  async function onIdentify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await post(api.auth.forgot, {
      identifier: String(form.get("identifier") ?? ""),
    });
    setPending(false);
    if (!result.ok || !result.data.demoCode) {
      setError(result.data.message ?? "The reset request could not be sent.");
      return;
    }
    setDemoCode(result.data.demoCode);
    setStep("otp");
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await post(api.auth.verifyOtp, {
      code: String(form.get("code") ?? ""),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.data.message ?? "That code could not be verified.");
      return;
    }
    setStep("reset");
  }

  async function onReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const localError = passwordError(password);
    if (localError) {
      setError(localError);
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    setError(null);
    const result = await post(api.auth.reset, { password });
    setPending(false);
    if (!result.ok) {
      setError(result.data.message ?? "The password could not be updated.");
      return;
    }
    setDoneMessage(result.data.message ?? "Password updated.");
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="mt-6">
        <p className="text-sm text-muted">{doneMessage}</p>
        <Link href="/login" className={`${primaryButtonClass} mt-6 w-full`}>
          Return to sign in
        </Link>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={onVerify} className="mt-6 flex flex-col gap-4">
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
          <p className="font-medium">Demo verification code</p>
          <p className="mt-1">
            SMS and email are not connected, so the code is shown here:{" "}
            <span className="font-semibold tracking-widest">{demoCode}</span>
          </p>
        </div>
        <div>
          <label className={labelClass} htmlFor="reset-code">
            Verification code
          </label>
          <input
            id="reset-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            className={inputClass}
          />
        </div>
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={`${primaryButtonClass} w-full`} disabled={pending}>
          {pending ? "Checking..." : "Verify code"}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => {
            setStep("identify");
            setError(null);
          }}
        >
          Use a different mobile or email
        </button>
      </form>
    );
  }

  if (step === "reset") {
    return (
      <form onSubmit={onReset} className="mt-6 flex flex-col gap-4">
        <div>
          <label className={labelClass} htmlFor="reset-password">
            New password
          </label>
          <input
            id="reset-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="reset-confirm">
            Confirm password
          </label>
          <input
            id="reset-confirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            className={inputClass}
          />
        </div>
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={`${primaryButtonClass} w-full`} disabled={pending}>
          {pending ? "Saving..." : "Update password"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onIdentify} className="mt-6 flex flex-col gap-4">
      <div>
        <label className={labelClass} htmlFor="reset-identifier">
          Registered mobile or email
        </label>
        <input
          id="reset-identifier"
          name="identifier"
          type="text"
          required
          autoComplete="username"
          className={inputClass}
        />
      </div>
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={`${primaryButtonClass} w-full`} disabled={pending}>
        {pending ? "Sending..." : "Send verification code"}
      </button>
      <p className="text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}
