"use client";

import { useEffect, useRef, useState } from "react";
import { secondaryButtonClass } from "@/components/ui/classes";
import { useApp } from "@/context/AppProvider";

const IDLE_MS = 15 * 60 * 1000;
const WARNING_MS = 60 * 1000;

export default function SessionSecurity() {
  const { logout } = useApp();
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const expired = useRef(false);

  useEffect(() => {
    function markActive() {
      if (expired.current) return;
      setLastActivity((previous) => {
        const time = Date.now();
        if (time - previous < 1000) return previous;
        return time;
      });
    }

    const events = ["pointerdown", "keydown", "wheel"] as const;
    events.forEach((event) => window.addEventListener(event, markActive));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, markActive));
      window.clearInterval(timer);
    };
  }, []);

  const remaining = IDLE_MS - (now - lastActivity);

  useEffect(() => {
    if (remaining > 0 || expired.current) return;
    expired.current = true;
    void logout("idle");
  }, [remaining, logout]);

  if (remaining <= 0 || remaining > WARNING_MS) return null;

  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>Your session will close in {label} because of inactivity.</p>
      <button
        type="button"
        className={secondaryButtonClass}
        onClick={() => {
          const time = Date.now();
          setLastActivity(time);
          setNow(time);
        }}
      >
        Stay signed in
      </button>
    </div>
  );
}
