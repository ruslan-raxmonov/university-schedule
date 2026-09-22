"use client";

import { useQuery } from "@tanstack/react-query";
import { api, getAdminToken } from "@/lib/api";
import type { Admin } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function AdminTopbar({
  title,
  onSearch,
}: {
  title: string;
  onSearch?: (value: string) => void;
}) {
  const { data: admin } = useQuery({
    queryKey: ["admin-me"],
    queryFn: () => api.get<Admin>("/api/v1/auth/admin/me", { auth: "admin" }),
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
  });

  return (
    <header className="flex flex-col gap-3 border-b border-[var(--line)] bg-white/80 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--maroon)]">
          Renessans Admin
        </p>
        <h1 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {onSearch ? (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--stone)]" />
            <Input
              className="pl-9"
              placeholder="Qidirish..."
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9 ring-2 ring-[var(--gold)]/40">
            <AvatarFallback className="bg-[var(--mist)] text-[var(--navy)]">
              {(admin?.full_name || "A")
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {admin?.full_name || "Admin"}
            </p>
            <p className="text-xs text-[var(--stone)]">{admin?.role || "—"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
