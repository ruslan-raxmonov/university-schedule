import type { LessonStatus, LessonType } from "@/lib/types";
import { format, parseISO, isValid } from "date-fns";
import { uz } from "date-fns/locale";

export const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  lecture: "Ma’ruza",
  seminar: "Seminar",
  practical: "Amaliyot",
  laboratory: "Laboratoriya",
  other: "Boshqa",
};

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  scheduled: "Rejalashtirilgan",
  cancelled: "Bekor qilindi",
  moved: "O‘zgartirildi",
  completed: "Yakunlangan",
};

export const WEEKDAY_SHORT = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
];

export function formatUzDate(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return String(value);
  return format(date, "EEEE, d-MMMM", { locale: uz });
}

export function formatUzShortDate(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return String(value);
  return format(date, "d MMM", { locale: uz });
}

export function roomLabel(building?: string | null, roomNumber?: string | null) {
  if (!roomNumber) return "—";
  if (!building || building === "Main") return `${roomNumber}-xona`;
  return `${building} · ${roomNumber}`;
}
