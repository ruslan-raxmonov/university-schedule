"use client";

import type { Schedule } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "brand-rail w-full rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 text-left transition hover:border-[color-mix(in_oklab,var(--gold)_50%,var(--line))] hover:shadow-[0_8px_24px_rgba(14,42,69,0.06)]",
        onClick && "cursor-pointer",
        lesson.status === "cancelled" && "opacity-70",
        isNow && "brand-rail-maroon ring-1 ring-[color-mix(in_oklab,var(--maroon)_25%,transparent)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold tracking-wide text-[var(--maroon)]">
            {formatTime(lesson.start_time)} — {formatTime(lesson.end_time)}
          </p>
          <h3 className="mt-1.5 font-display text-base font-bold tracking-tight text-[var(--ink)]">
            {lesson.subject?.name || "Fan"}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isNow ? <Badge variant="maroon">Hozir</Badge> : null}
          <Badge variant={statusVariant(lesson.status)}>
            {lesson.status === "cancelled"
              ? "Bekor"
              : lesson.status === "moved"
                ? "Ko‘chirilgan"
                : LESSON_STATUS_LABEL[lesson.status]}
          </Badge>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-[var(--stone)]">
        <p className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-[var(--gold)]" />
          {lesson.teacher?.full_name || "O‘qituvchi"}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[var(--gold)]" />
          {roomLabel(lesson.room?.building, lesson.room?.room_number)}
        </p>
      </div>

      <div className="mt-3">
        <Badge variant="gold">{LESSON_TYPE_LABEL[lesson.lesson_type]}</Badge>
      </div>
    </button>
  );
}
