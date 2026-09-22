"use client";

import { usePathname } from "next/navigation";
import { AdminGuard } from "@/hooks/use-admin-auth";
import { AdminSidebar } from "@/components/admin/sidebar";

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
        <div className="min-h-dvh bg-neutral-50 dark:bg-neutral-950">
          {children}
        </div>
      ) : (
        <div className="flex min-h-dvh bg-neutral-50 dark:bg-neutral-950">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      )}
    </AdminGuard>
  );
}
