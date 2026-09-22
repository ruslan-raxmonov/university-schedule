"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api.get<Notification[]>("/api/v1/notifications", { auth: "student" }),
  });

  const markOne = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/api/v1/notifications/${id}/read`, undefined, {
        auth: "student",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () =>
      api.post("/api/v1/notifications/read-all", undefined, {
        auth: "student",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Barchasi o‘qildi");
    },
  });

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--maroon)]">
            Bildirishnomalar
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
            Yangiliklar
          </h1>
          <p className="text-sm text-[var(--stone)]">Jadval o‘zgarishlari</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          Barchasini o‘qish
        </Button>
      </header>

      {listQuery.isLoading ? <LoadingCards /> : null}
      {listQuery.isError ? (
        <ErrorState
          message={
            listQuery.error instanceof Error ? listQuery.error.message : undefined
          }
          onRetry={() => listQuery.refetch()}
        />
      ) : null}
      {listQuery.data && listQuery.data.length === 0 ? (
        <EmptyState title="Hozircha yangi bildirishnomalar yo‘q." />
      ) : null}

      <div className="space-y-3">
        {listQuery.data?.map((n) => (
          <Card
            key={n.id}
            className={cn(
              "cursor-pointer p-4",
              !n.is_read && "border-neutral-900/20 dark:border-neutral-100/20",
            )}
            onClick={() => {
              if (!n.is_read) markOne.mutate(n.id);
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">
                  {n.message}
                </p>
                <p className="mt-2 text-xs text-neutral-400">
                  {n.created_at
                    ? format(parseISO(n.created_at), "dd MMM, HH:mm")
                    : ""}
                </p>
              </div>
              {!n.is_read ? <Badge variant="info">Yangi</Badge> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
