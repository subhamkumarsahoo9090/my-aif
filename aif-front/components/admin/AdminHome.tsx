"use client";

import { useEffect, useState } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
import SuperCommand from "@/components/admin/SuperCommand";
import { api, apiFetch } from "@/config/endapi";
import type { AdminUser } from "@/lib/types";

export default function AdminHome() {
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch(api.admin.session)
      .then(async (response) => (await response.json()) as { user: AdminUser | null })
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!user) return <div className="min-h-40" />;
  if (user.role === "superadmin") return <SuperCommand />;
  return <AdminDashboard />;
}
