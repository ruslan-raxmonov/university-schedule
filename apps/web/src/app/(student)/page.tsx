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
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Salom, {firstName(student?.full_name || "talaba")} 👋
        </h1>
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {student?.group?.code || "Guruh tanlanmagan"}
        </p>
        <p className="text-sm capitalize text-neutral-500">{todayLabel}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Bugungi darslar</h2>

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
          <EmptyState title="Bugun dars yo‘q 🎉" />
        ) : null}
        {todayQuery.data?.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            isNow={isCurrentLesson(lesson)}
            onClick={() => setSelected(lesson)}
          />
        ))}
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.subject?.name}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-neutral-500">O‘qituvchi:</span>{" "}
                {selected.teacher?.full_name}
              </p>
              <p>
                <span className="text-neutral-500">Xona:</span>{" "}
                {roomLabel(selected.room?.building, selected.room?.room_number)}
              </p>
              <p>
                <span className="text-neutral-500">Sana:</span> {selected.date}
              </p>
              <p>
                <span className="text-neutral-500">Vaqt:</span>{" "}
                {formatTime(selected.start_time)} — {formatTime(selected.end_time)}
              </p>
              <p>
                <span className="text-neutral-500">Guruh:</span>{" "}
                {selected.group?.code}
              </p>
              <Badge variant="secondary">
                {LESSON_TYPE_LABEL[selected.lesson_type]}
              </Badge>
              {selected.notes ? (
                <p className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900">
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
