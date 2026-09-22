"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isWithinInterval, parse, parseISO } from "date-fns";
import { api } from "@/lib/api";
import type { Schedule } from "@/lib/types";
import { useStudentAuth } from "@/hooks/use-student-auth";
import { LessonCard } from "@/components/student/lesson-card";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { formatUzDate } from "@/lib/labels";
import { firstName } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LESSON_TYPE_LABEL, roomLabel } from "@/lib/labels";
import { formatTime } from "@/lib/utils";

function isCurrentLesson(lesson: Schedule) {
  try {
    const now = new Date();
    const start = parse(lesson.start_time.slice(0, 5), "HH:mm", parseISO(lesson.date));
    const end = parse(lesson.end_time.slice(0, 5), "HH:mm", parseISO(lesson.date));
    return isWithinInterval(now, { start, end });
  } catch {
    return false;
  }
}

export default function StudentHomePage() {
  const { student, isLoading: authLoading } = useStudentAuth();
  const [selected, setSelected] = useState<Schedule | null>(null);

  const todayQuery = useQuery({
    queryKey: ["schedules-today"],
    enabled: Boolean(student?.group_id),
    queryFn: () => api.get<Schedule[]>("/api/v1/schedules/today", { auth: "student" }),
  });

  const todayLabel = useMemo(() => formatUzDate(new Date()), []);

  if (authLoading) return <LoadingCards />;

  return (
    <div className="space-y-6">
      <header className="animate-rise space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--maroon)]">
          Renessans · Jadval
        </p>
        <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-[var(--ink)]">
          Salom, {firstName(student?.full_name || "talaba")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="maroon">{student?.group?.code || "Guruh tanlanmagan"}</Badge>
          <span className="text-sm capitalize text-[var(--stone)]">{todayLabel}</span>
        </div>
      </header>

      <section className="animate-rise-delay space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="reveal-line mb-2" />
            <h2 className="font-display text-lg font-bold tracking-tight">
              Bugungi darslar
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
            description="Dam oling yoki haftalik jadvalni tekshiring."
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
                <span className="text-[var(--stone)]">O‘qituvchi</span>
                <br />
                <span className="font-medium text-[var(--ink)]">
                  {selected.teacher?.full_name}
                </span>
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
              {selected.notes ? (
                <p className="rounded-lg bg-[var(--mist)] p-3 text-[var(--ink-soft)]">
                  {selected.notes}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <p className="sr-only">{format(new Date(), "yyyy-MM-dd")}</p>
    </div>
  );
}
