"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  ApiError,
  getAppToken,
  setAppToken,
} from "@/lib/api";
import type {
  AppRole,
  PendingUser,
  Student,
  Teacher,
  TokenResponse,
} from "@/lib/types";
import {
  buildBypassInitData,
  getTelegramInitData,
  initTelegramWebApp,
  isInsideTelegramShell,
  telegramBypassEnabled,
  waitForTelegramInitData,
} from "@/lib/telegram";
import { Button } from "@/components/ui/button";
import { LoadingCards } from "@/components/shared/query-state";

type AppAuthContextValue = {
  role: AppRole | null;
  student: Student | null;
  teacher: Teacher | null;
  pending: PendingUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
  applyAuth: (result: TokenResponse) => void;
};

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

async function authenticateWithInitData(initData: string) {
  const result = await api.post<TokenResponse>(
    "/api/v1/auth/telegram",
    { init_data: initData },
    { auth: "app", token: null },
  );
  setAppToken(result.access_token);
  return result;
}

function routeForAuth(result: TokenResponse): string {
  if (result.role === "teacher") return "/teacher";
  if (result.role === "student") {
    return result.needs_onboarding || !result.student?.group_id
      ? "/onboarding/student"
      : "/";
  }
  return "/onboarding";
}

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [bootError, setBootError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [needsBypass, setNeedsBypass] = useState(false);
  const [session, setSession] = useState<TokenResponse | null>(null);

  const isAdminPath = pathname.startsWith("/admin");

  const studentQuery = useQuery({
    queryKey: ["student-me"],
    enabled:
      ready &&
      !isAdminPath &&
      Boolean(getAppToken()) &&
      session?.role === "student",
    queryFn: () => api.get<Student>("/api/v1/auth/me", { auth: "student" }),
    retry: false,
  });

  const teacherQuery = useQuery({
    queryKey: ["teacher-me"],
    enabled:
      ready &&
      !isAdminPath &&
      Boolean(getAppToken()) &&
      session?.role === "teacher",
    queryFn: () =>
      api.get<Teacher>("/api/v1/auth/teacher/me", { auth: "teacher" }),
    retry: false,
  });

  const applyAuth = useCallback((result: TokenResponse) => {
    setAppToken(result.access_token);
    setSession(result);
    setNeedsBypass(false);
    setBootError(null);
  }, []);

  const bootstrap = useCallback(async () => {
    if (isAdminPath) {
      setReady(true);
      return;
    }

    setBootError(null);
    initTelegramWebApp();

    const existing = getAppToken();
    if (existing && session) {
      setReady(true);
      return;
    }

    if (existing && !session) {
      // Recover role by probing me endpoints
      try {
        const student = await api.get<Student>("/api/v1/auth/me", {
          auth: "student",
        });
        setSession({
          access_token: existing,
          token_type: "bearer",
          role: "student",
          needs_onboarding: !student.group_id,
          student,
        });
        setReady(true);
        return;
      } catch {
        /* try teacher */
      }
      try {
        const teacher = await api.get<Teacher>("/api/v1/auth/teacher/me", {
          auth: "teacher",
        });
        setSession({
          access_token: existing,
          token_type: "bearer",
          role: "teacher",
          needs_onboarding: false,
          teacher,
        });
        setReady(true);
        return;
      } catch {
        /* pending or invalid */
      }
      // Assume pending if token exists but me fails
      setSession({
        access_token: existing,
        token_type: "bearer",
        role: "pending",
        needs_onboarding: true,
      });
      setReady(true);
      return;
    }

    const initData =
      getTelegramInitData() || (await waitForTelegramInitData(4500));

    if (initData) {
      try {
        const result = await authenticateWithInitData(initData);
        applyAuth(result);
        setReady(true);
        return;
      } catch (err) {
        const apiHint =
          err instanceof ApiError
            ? err.message
            : "Telegram auth muvaffaqiyatsiz";
        const offline =
          err instanceof TypeError ||
          (err instanceof Error && /fetch|network|Failed/i.test(err.message));
        setBootError(
          offline
            ? "Serverga ulanib bo‘lmadi. NEXT_PUBLIC_API_URL va backend holatini tekshiring."
            : apiHint,
        );
        setReady(true);
        return;
      }
    }

    if (telegramBypassEnabled()) {
      setNeedsBypass(true);
      setReady(true);
      return;
    }

    if (isInsideTelegramShell()) {
      setBootError(
        "Telegram initData topilmadi. Botdagi «📅 Dars jadvalim» tugmasi orqali qayta oching.",
      );
    } else {
      setBootError(
        "Telegram Mini App ichida oching yoki lokal uchun NEXT_PUBLIC_TELEGRAM_BYPASS=true qo‘ying.",
      );
    }
    setReady(true);
  }, [applyAuth, isAdminPath, session]);

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminPath]);

  useEffect(() => {
    if (isAdminPath || !ready || !session) return;

    const onOnboarding = pathname.startsWith("/onboarding");
    const onTeacher = pathname.startsWith("/teacher");

    if (session.role === "pending" && !onOnboarding) {
      router.replace("/onboarding");
      return;
    }
    if (session.role === "teacher" && !onTeacher) {
      router.replace("/teacher");
      return;
    }
    if (session.role === "student") {
      const needsGroup = session.needs_onboarding || !session.student?.group_id;
      if (needsGroup && pathname !== "/onboarding/student") {
        router.replace("/onboarding/student");
        return;
      }
      if (!needsGroup && onOnboarding) {
        router.replace("/");
        return;
      }
      if (!needsGroup && onTeacher) {
        router.replace("/");
      }
    }
  }, [ready, session, pathname, router, isAdminPath]);

  // Keep student session fresh from query
  useEffect(() => {
    if (studentQuery.data && session?.role === "student") {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              student: studentQuery.data,
              needs_onboarding: !studentQuery.data.group_id,
            }
          : prev,
      );
    }
  }, [studentQuery.data, session?.role]);

  useEffect(() => {
    if (teacherQuery.data && session?.role === "teacher") {
      setSession((prev) =>
        prev ? { ...prev, teacher: teacherQuery.data } : prev,
      );
    }
  }, [teacherQuery.data, session?.role]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["student-me"] });
    await queryClient.invalidateQueries({ queryKey: ["teacher-me"] });
  }, [queryClient]);

  const logout = useCallback(() => {
    setAppToken(null);
    setSession(null);
    queryClient.clear();
    setNeedsBypass(telegramBypassEnabled());
    setReady(true);
  }, [queryClient]);

  const value = useMemo<AppAuthContextValue>(
    () => ({
      role: session?.role ?? null,
      student: session?.student ?? studentQuery.data ?? null,
      teacher: session?.teacher ?? teacherQuery.data ?? null,
      pending: session?.pending ?? null,
      isLoading:
        !ready ||
        (Boolean(getAppToken()) &&
          ((session?.role === "student" && studentQuery.isLoading) ||
            (session?.role === "teacher" && teacherQuery.isLoading))),
      refresh,
      logout,
      applyAuth,
    }),
    [
      session,
      studentQuery.data,
      teacherQuery.data,
      ready,
      studentQuery.isLoading,
      teacherQuery.isLoading,
      refresh,
      logout,
      applyAuth,
    ],
  );

  if (isAdminPath) {
    return (
      <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <LoadingCards count={2} />
      </div>
    );
  }

  if (needsBypass && !getAppToken()) {
    return (
      <div className="atmosphere mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <div className="w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-[0_20px_50px_rgba(8,49,83,0.12)]">
          <div className="bg-[var(--navy)] px-6 py-8 text-center text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/renessans-logo.svg"
              alt="Renessans"
              className="mx-auto mb-3 h-16 w-16 rounded-full bg-white p-0.5"
            />
            <p className="font-display text-xl font-bold">Renessans | Jadval</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">
              Lokal kirish
            </p>
          </div>
          <div className="space-y-3 p-6">
            <p className="text-sm text-[var(--stone)]">
              Demo akkaunt bilan kirib, talaba yoki ustoz kabinetini tanlang.
            </p>
            <Button
              className="w-full"
              onClick={async () => {
                try {
                  const result = await authenticateWithInitData(
                    buildBypassInitData(),
                  );
                  applyAuth(result);
                  router.replace(routeForAuth(result));
                } catch (err) {
                  setBootError(
                    err instanceof ApiError
                      ? err.message
                      : "Bypass login muvaffaqiyatsiz",
                  );
                }
              }}
            >
              Davom etish
            </Button>
            {bootError ? (
              <p className="text-sm text-[var(--error)]">{bootError}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (bootError && !getAppToken()) {
    return (
      <div className="atmosphere mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <div className="w-full rounded-xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/renessans-logo.svg"
            alt=""
            className="mb-4 h-12 w-12 rounded-full"
          />
          <h2 className="font-display text-xl font-bold text-[var(--ink)]">
            Kirish mumkin emas
          </h2>
          <p className="mt-2 text-sm text-[var(--stone)]">{bootError}</p>
          <Button className="mt-4" onClick={() => void bootstrap()}>
            Qayta urinish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);
  if (!ctx) {
    throw new Error("useAppAuth must be used within AppAuthProvider");
  }
  return ctx;
}

/** Back-compat wrapper for student pages */
export function useStudentAuth() {
  const auth = useAppAuth();
  return {
    student: auth.student,
    isLoading: auth.isLoading,
    refresh: auth.refresh,
    logout: auth.logout,
  };
}
