"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Inbox } from "lucide-react";

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-28 w-full rounded-xl bg-[color-mix(in_oklab,var(--navy)_8%,white)]"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-white/40 px-6 py-14 text-center">
      <Inbox className="mb-3 h-8 w-8 text-[var(--gold)]" />
      <p className="font-display text-base font-bold text-[var(--ink)]">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-[var(--stone)]">{description}</p>
      ) : null}
    </div>
  );
}

export function ErrorState({
  message = "Ma'lumotni yuklashda xatolik yuz berdi.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--error)_25%,transparent)] bg-[color-mix(in_oklab,var(--error)_6%,white)] px-6 py-10 text-center">
      <AlertCircle className="mb-3 h-7 w-7 text-[var(--error)]" />
      <p className="text-sm font-medium text-[var(--error)]">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Qayta urinish
        </Button>
      ) : null}
    </div>
  );
}
