"use client";

import { StudentAuthProvider } from "@/hooks/use-student-auth";
import { StudentBottomNav } from "@/components/student/bottom-nav";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentAuthProvider>
      <div className="min-h-dvh bg-[var(--tg-bg)] text-[var(--tg-text)]">
        <main className="mx-auto max-w-lg px-4 pb-24 pt-5">{children}</main>
        <StudentBottomNav />
      </div>
    </StudentAuthProvider>
  );
}
