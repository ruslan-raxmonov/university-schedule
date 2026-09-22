import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(value: string) {
  // Accepts "HH:MM:SS" or "HH:MM"
  return value.slice(0, 5);
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
