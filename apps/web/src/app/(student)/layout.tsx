"use client";

import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { StudentBottomNav } from "@/components/student/bottom-nav";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideChrome = pathname.startsWith("/onboarding");

  return (
    <div className="atmosphere min-h-dvh text-[var(--ink)]">
      <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
        {!hideChrome ? (
          <div className="mb-5 flex items-center justify-between">
            <BrandLogo size={44} withWordmark priority />
            <div className="reveal-line" />
          </div>
        ) : null}
        {children}
      </div>
      <StudentBottomNav />
    </div>
  );
}
