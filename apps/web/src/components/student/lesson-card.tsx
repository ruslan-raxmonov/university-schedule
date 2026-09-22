"use client";

import type { Schedule } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  LESSON_STATUS_LABEL,
  LESSON_TYPE_LABEL,
  roomLabel,
} from "@/lib/labels";
import { cn, formatTime } from "@/lib/utils";
import { MapPin, UserRound } from "lucide-react";

function statusVariant(status: Schedule["status"]) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "moved") return "warning" as const;
  if (status === "completed") return "secondary" as const;
  return "info" as const;
}

export function LessonCard({
  lesson,
  isNow,
  onClick,
}: {
  lesson: Schedule;
  isNow?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "overflow-hidden border-neutral-200/90 p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700",
        onClick && "cursor-pointer",
        lesson.status === "cancelled" && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            {formatTime(lesson.start_time)} — {formatTime(lesson.end_time)}
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">
            {lesson.subject?.name || "Fan"}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isNow ? (
            <Badge variant="success">● Hozir</Badge>
          ) : null}
          <Badge variant={statusVariant(lesson.status)}>
            {lesson.status === "cancelled"
              ? "🔴 Bekor qilindi"
              : lesson.status === "moved"
                ? "🟠 O‘zgartirildi"
                : LESSON_STATUS_LABEL[lesson.status]}
          </Badge>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-300">
        <p className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-neutral-400" />
          {lesson.teacher?.full_name || "O‘qituvchi"}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-neutral-400" />
          {roomLabel(lesson.room?.building, lesson.room?.room_number)}
        </p>
      </div>

      <div className="mt-3">
        <Badge variant="secondary">{LESSON_TYPE_LABEL[lesson.lesson_type]}</Badge>
      </div>
    </Card>
  );
}
