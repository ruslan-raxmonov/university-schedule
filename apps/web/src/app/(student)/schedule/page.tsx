"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { api } from "@/lib/api";
import type { Schedule, WeekSchedule } from "@/lib/types";
import { useStudentAuth } from "@/hooks/use-student-auth";
import { LessonCard } from "@/components/student/lesson-card";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WEEKDAY_SHORT } from "@/lib/labels";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function SchedulePage() {
  const { student } = useStudentAuth();
  const [weekStart, setWeekStart] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  );

  const weekQuery = useQuery({
    queryKey: ["schedules-week", weekStart],
    enabled: Boolean(student?.group_id),
    queryFn: () =>
      api.get<WeekSchedule>("/api/v1/schedules/week", {
        auth: "student",
        query: { week_start: weekStart },
      }),
  });

  const byDay = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    for (let i = 0; i < 7; i++) {
      const d = format(addDays(parseISO(weekStart), i), "yyyy-MM-dd");
      map[d] = [];
    }
    weekQuery.data?.items.forEach((item) => {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    });
    return map;
  }, [weekQuery.data, weekStart]);

  const days = Object.keys(byDay);
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultDay = days.includes(today) ? today : days[0];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Haftalik jadval
          </h1>
          <p className="text-sm text-neutral-500">
            {weekQuery.data
              ? `${weekQuery.data.week_start} — ${weekQuery.data.week_end}`
              : "—"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setWeekStart(
                format(addDays(parseISO(weekStart), -7), "yyyy-MM-dd"),
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setWeekStart(
                format(addDays(parseISO(weekStart), 7), "yyyy-MM-dd"),
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {weekQuery.isLoading ? <LoadingCards /> : null}
      {weekQuery.isError ? (
        <ErrorState
          message={
            weekQuery.error instanceof Error ? weekQuery.error.message : undefined
          }
          onRetry={() => weekQuery.refetch()}
        />
      ) : null}

      {weekQuery.data ? (
        <Tabs defaultValue={defaultDay}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            {days.map((day, idx) => (
              <TabsTrigger key={day} value={day} className="flex-1 text-xs">
                {WEEKDAY_SHORT[idx].slice(0, 3)}
              </TabsTrigger>
            ))}
          </TabsList>
          {days.map((day, idx) => (
            <TabsContent key={day} value={day} className="space-y-3">
              <p className="text-sm font-medium text-neutral-500">
                {WEEKDAY_SHORT[idx]}, {day}
              </p>
              {byDay[day].length === 0 ? (
                <EmptyState title="Bu kun uchun dars yo‘q" />
              ) : (
                byDay[day].map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : null}
    </div>
  );
}
