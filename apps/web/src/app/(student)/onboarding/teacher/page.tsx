"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Paginated, Teacher, TokenResponse } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { toast } from "sonner";
import { useAppAuth } from "@/hooks/use-app-auth";

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const { applyAuth } = useAppAuth();
  const [q, setQ] = useState("");

  const teachersQuery = useQuery({
    queryKey: ["teachers-onboarding", q],
    queryFn: () =>
      api.get<Paginated<Teacher>>("/api/v1/teachers", {
        auth: "app",
        query: { page_size: 200, q: q || undefined },
      }),
  });

  const linkTeacher = useMutation({
    mutationFn: (teacher_id: number) =>
      api.post<TokenResponse>(
        "/api/v1/auth/onboarding/teacher",
        { teacher_id },
        { auth: "pending" },
      ),
    onSuccess: (result) => {
      applyAuth(result);
      toast.success("Ustoz kabineti ochildi");
      router.replace("/teacher");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const teachers = useMemo(() => {
    const items = teachersQuery.data?.items || [];
    // Prefer unlinked teachers first
    return [...items].sort((a, b) => {
      const al = a.telegram_id ? 1 : 0;
      const bl = b.telegram_id ? 1 : 0;
      return al - bl;
    });
  }, [teachersQuery.data]);

  return (
    <div className="space-y-6 pb-8">
      <header className="animate-rise space-y-4 pt-2 text-center">
        <div className="flex justify-center">
          <BrandLogo size={64} priority className="justify-center" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--maroon)]">
          Ustoz kabineti
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)]">
          O‘zingizni tanlang
        </h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-[var(--stone)]">
          Ro‘yxatdan o‘z ismingizni toping. Telegram akkauntingiz shu
          o‘qituvchiga bog‘lanadi.
        </p>
        <div className="mx-auto reveal-line" />
      </header>

      <Input
        placeholder="Ism bo‘yicha qidirish..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {teachersQuery.isLoading ? <LoadingCards /> : null}
      {teachersQuery.isError ? (
        <ErrorState
          message={
            teachersQuery.error instanceof Error
              ? teachersQuery.error.message
              : undefined
          }
          onRetry={() => teachersQuery.refetch()}
        />
      ) : null}
      {!teachersQuery.isLoading && teachers.length === 0 ? (
        <EmptyState title="O‘qituvchi topilmadi" />
      ) : null}

      <div className="space-y-2">
        {teachers.map((t) => {
          const taken = Boolean(t.telegram_id);
          return (
            <div
              key={t.id}
              className="brand-rail-maroon flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4"
            >
              <div>
                <p className="font-display font-bold text-[var(--ink)]">
                  {t.full_name}
                </p>
                <p className="text-sm text-[var(--stone)]">
                  {t.department || "Kafedra ko‘rsatilmagan"}
                  {taken ? " · band" : ""}
                </p>
              </div>
              <Button
                size="sm"
                disabled={taken || linkTeacher.isPending}
                onClick={() => linkTeacher.mutate(t.id)}
              >
                {taken ? "Band" : "Tanlash"}
              </Button>
            </div>
          );
        })}
      </div>

      <Button variant="ghost" className="w-full" onClick={() => router.push("/onboarding")}>
        ← Rolni o‘zgartirish
      </Button>
    </div>
  );
}
