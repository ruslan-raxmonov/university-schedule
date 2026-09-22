"use client";

import { AdminGuard } from "@/hooks/use-admin-auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { usePathname } from "next/navigation";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <AdminGuard>
      {isLogin ? (
        <div className="min-h-dvh">{children}</div>
      ) : (
        <div className="atmosphere flex min-h-dvh">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col bg-[var(--paper)]/80">
            {children}
          </div>
        </div>
      )}
    </AdminGuard>
  );
}
