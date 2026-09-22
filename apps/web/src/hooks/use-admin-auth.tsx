"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, getAdminToken, setAdminToken } from "@/lib/api";
import type { Admin } from "@/lib/types";
import { LoadingCards } from "@/components/shared/query-state";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const isLogin = pathname === "/admin/login";

  useEffect(() => setMounted(true), []);

  const token = mounted ? getAdminToken() : null;

  const meQuery = useQuery({
    queryKey: ["admin-me"],
    enabled: mounted && Boolean(token) && !isLogin,
    queryFn: () => api.get<Admin>("/api/v1/auth/admin/me", { auth: "admin" }),
    retry: false,
  });

  useEffect(() => {
    if (!mounted) return;
    if (!token && !isLogin) {
      router.replace("/admin/login");
    }
    if (token && isLogin) {
      router.replace("/admin");
    }
  }, [mounted, token, isLogin, router]);

  useEffect(() => {
    if (meQuery.isError) {
      setAdminToken(null);
      router.replace("/admin/login");
    }
  }, [meQuery.isError, router]);

  if (!mounted) {
    return (
      <div className="p-8">
        <LoadingCards count={2} />
      </div>
    );
  }

  if (isLogin) return <>{children}</>;

  if (!token || meQuery.isLoading) {
    return (
      <div className="p-8">
        <LoadingCards count={2} />
      </div>
    );
  }

  return <>{children}</>;
}

export function useAdmin() {
  return useQuery({
    queryKey: ["admin-me"],
    queryFn: () => api.get<Admin>("/api/v1/auth/admin/me", { auth: "admin" }),
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
  });
}
