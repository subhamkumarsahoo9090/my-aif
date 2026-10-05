"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/config/endapi";

export function usePortalResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    apiFetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Request failed");
        return (await response.json()) as T;
      })
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [url, attempt]);

  const reload = useCallback(() => {
    setData(null);
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, []);

  return { data, status, reload };
}
