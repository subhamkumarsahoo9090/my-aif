"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ToastViewport from "@/components/ui/ToastViewport";
import { api, apiFetch, saveSessionToken } from "@/config/endapi";
import type { SessionUser } from "@/lib/types";

type Toast = {
  id: string;
  message: string;
  tone: "error" | "success";
};

type AppContextValue = {
  user: SessionUser | null;
  ready: boolean;
  sidebarOpen: boolean;
  sessionExpired: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  login: (identifier: string, password: string) => Promise<string>;
  logout: (reason?: "manual" | "idle") => Promise<void>;
  acknowledgeSessionExpiry: () => void;
  pushToast: (message: string, tone?: Toast["tone"]) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef<number[]>([]);

  useEffect(() => {
    let active = true;
    apiFetch(api.auth.session)
      .then(async (response) => {
        if (!response.ok) throw new Error("session");
        return (await response.json()) as { user: SessionUser | null };
      })
      .then((data) => {
        if (!active) return;
        setUser(data.user);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const pending = timeouts.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message: string, tone: Toast["tone"] = "error") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    const timeout = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
    timeouts.current.push(timeout);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    try {
      const response = await apiFetch(api.auth.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        user?: SessionUser;
        destination?: string;
        token?: string;
      };
      if (!response.ok) {
        return data.message ?? "Could not sign in.";
      }
      if (data.token) saveSessionToken(data.token);
      setSessionExpired(false);
      if (data.destination === "/admin") {
        setUser(null);
        return "/admin";
      }
      if (!data.user) {
        return data.message ?? "Could not sign in.";
      }
      setUser(data.user);
      return "/dashboard";
    } catch {
      return "Could not sign in.";
    }
  }, []);

  const logout = useCallback(async (reason: "manual" | "idle" = "manual") => {
    try {
      await apiFetch(api.auth.logout, { method: "POST" });
    } catch {
      // The local session still ends if the request fails.
    }
    saveSessionToken(null);
    setUser(null);
    setSidebarOpen(false);
    setSessionExpired(reason === "idle");
  }, []);

  const acknowledgeSessionExpiry = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      sidebarOpen,
      sessionExpired,
      toggleSidebar,
      setSidebarOpen,
      login,
      logout,
      acknowledgeSessionExpiry,
      pushToast,
    }),
    [
      user,
      ready,
      sidebarOpen,
      sessionExpired,
      toggleSidebar,
      login,
      logout,
      acknowledgeSessionExpiry,
      pushToast,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider.");
  }
  return context;
}
