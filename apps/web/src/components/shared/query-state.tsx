"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Inbox } from "lucide-react";

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 px-6 py-14 text-center dark:border-neutral-800">
      <Inbox className="mb-3 h-8 w-8 text-neutral-400" />
      <p className="text-base font-medium text-neutral-900 dark:text-neutral-100">
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 px-6 py-10 text-center dark:border-red-900/50 dark:bg-red-950/20">
      <AlertCircle className="mb-3 h-7 w-7 text-red-600" />
      <p className="text-sm font-medium text-red-800 dark:text-red-300">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Qayta urinish
        </Button>
      ) : null}
    </div>
  );
}
