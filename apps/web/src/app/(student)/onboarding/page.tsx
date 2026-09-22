"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useAppAuth } from "@/hooks/use-app-auth";

export default function OnboardingRolePage() {
  const router = useRouter();
  const { role } = useAppAuth();

  if (role === "teacher") {
    router.replace("/teacher");
    return null;
  }
  if (role === "student") {
    router.replace("/onboarding/student");
    return null;
  }

  return (
    <div className="space-y-8 pb-8 pt-2">
      <header className="animate-rise space-y-4 text-center">
        <div className="flex justify-center">
          <BrandLogo size={72} priority className="justify-center" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--maroon)]">
          Renessans Ta’lim
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)]">
          Kim sifatida kirasiz?
        </h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-[var(--stone)]">
          Talaba yoki ustoz kabinetini tanlang. Keyinroq profil orqali
          o‘zgartirish mumkin emas — yangi Telegram bilan qayta bog‘lang.
        </p>
        <div className="mx-auto reveal-line" />
      </header>

      <div className="animate-rise-delay space-y-3">
        <button
          type="button"
          onClick={() => router.push("/onboarding/student")}
          className="brand-rail flex w-full items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 text-left transition hover:border-[var(--gold)]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mist)] text-[var(--maroon)]">
            <UserRound className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-display text-lg font-bold text-[var(--ink)]">
              Talaba
            </span>
            <span className="text-sm text-[var(--stone)]">
              Guruh jadvali, qidiruv, bildirishnomalar
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/onboarding/teacher")}
          className="brand-rail-maroon flex w-full items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--card)] p-5 text-left transition hover:border-[var(--maroon)]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mist)] text-[var(--navy)]">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-display text-lg font-bold text-[var(--ink)]">
              Ustoz
            </span>
            <span className="text-sm text-[var(--stone)]">
              Shaxsiy dars jadvali va guruhlar
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
