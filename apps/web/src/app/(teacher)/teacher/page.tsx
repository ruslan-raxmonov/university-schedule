"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isWithinInterval, parse, parseISO } from "date-fns";
import { api } from "@/lib/api";
import type { Schedule } from "@/lib/types";
import { useAppAuth } from "@/hooks/use-app-auth";
import { LessonCard } from "@/components/student/lesson-card";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { formatUzDate, LESSON_TYPE_LABEL, roomLabel } from "@/lib/labels";
import { firstName, formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function isCurrentLesson(lesson: Schedule) {
  try {
    const now = new Date();
    const start = parse(
      lesson.start_time.slice(0, 5),
      "HH:mm",
      parseISO(lesson.date),
    );
    const end = parse(
      lesson.end_time.slice(0, 5),
      "HH:mm",
      parseISO(lesson.date),
    );
    return isWithinInterval(now, { start, end });
  } catch {
    return false;
  }
}

export default function TeacherHomePage() {
  const { teacher, isLoading } = useAppAuth();
  const [selected, setSelected] = useState<Schedule | null>(null);
  const todayLabel = useMemo(() => formatUzDate(new Date()), []);

  const todayQuery = useQuery({
    queryKey: ["teacher-schedules-today"],
    enabled: Boolean(teacher?.id),
    queryFn: () =>
      api.get<Schedule[]>("/api/v1/teacher/schedules/today", {
        auth: "teacher",
      }),
  });

  if (isLoading) return <LoadingCards />;

  return (
    <div className="space-y-6">
      <header className="animate-rise space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--maroon)]">
          Ustoz kabineti
        </p>
        <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-[var(--ink)]">
          Assalomu alaykum, {firstName(teacher?.full_name || "ustoz")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="maroon">{teacher?.department || "O‘qituvchi"}</Badge>
          <span className="text-sm capitalize text-[var(--stone)]">{todayLabel}</span>
        </div>
      </header>

      <section className="animate-rise-delay space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="reveal-line mb-2" />
            <h2 className="font-display text-lg font-bold tracking-tight">
              Bugungi darslarim
            </h2>
          </div>
          <p className="text-xs font-medium text-[var(--stone)]">
            {todayQuery.data?.length ?? 0} ta
          </p>
        </div>

        {todayQuery.isLoading ? <LoadingCards /> : null}
        {todayQuery.isError ? (
          <ErrorState
            message={
              todayQuery.error instanceof Error
                ? todayQuery.error.message
                : undefined
            }
            onRetry={() => todayQuery.refetch()}
          />
        ) : null}
        {todayQuery.data && todayQuery.data.length === 0 ? (
          <EmptyState
            title="Bugun dars yo‘q"
            description="Haftalik jadvalni tekshirib ko‘ring."
          />
        ) : null}
        <div className="space-y-3">
          {todayQuery.data?.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              isNow={isCurrentLesson(lesson)}
              onClick={() => setSelected(lesson)}
            />
          ))}
        </div>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent className="border-[var(--line)] bg-[var(--card)]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-[var(--ink)]">
              {selected?.subject?.name}
            </DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="reveal-line" />
              <p>
                <span className="text-[var(--stone)]">Guruh</span>
                <br />
                <span className="font-medium">{selected.group?.code}</span>
              </p>
              <p>
                <span className="text-[var(--stone)]">Xona</span>
                <br />
                <span className="font-medium">
                  {roomLabel(selected.room?.building, selected.room?.room_number)}
                </span>
              </p>
              <p>
                <span className="text-[var(--stone)]">Vaqt</span>
                <br />
                <span className="font-mono font-semibold text-[var(--maroon)]">
                  {formatTime(selected.start_time)} — {formatTime(selected.end_time)}
                </span>
              </p>
              <Badge variant="gold">
                {LESSON_TYPE_LABEL[selected.lesson_type]}
              </Badge>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
