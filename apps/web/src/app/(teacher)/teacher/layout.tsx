"use client";

import { BrandLogo } from "@/components/brand-logo";
import { TeacherBottomNav } from "@/components/teacher/bottom-nav";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="atmosphere min-h-dvh text-[var(--ink)]">
      <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <div className="mb-5 flex items-center justify-between">
          <BrandLogo size={44} withWordmark priority />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--maroon)]">
            Ustoz
          </p>
        </div>
        {children}
      </div>
      <TeacherBottomNav />
    </div>
  );
}
