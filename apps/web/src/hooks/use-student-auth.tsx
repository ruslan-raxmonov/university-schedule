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
  getStudentToken,
  setStudentToken,
} from "@/lib/api";
import type { Student, TokenResponse } from "@/lib/types";
import {
  buildBypassInitData,
  getTelegramInitData,
  initTelegramWebApp,
  telegramBypassEnabled,
} from "@/lib/telegram";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCards } from "@/components/shared/query-state";

type StudentAuthContextValue = {
  student: Student | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
};

const StudentAuthContext = createContext<StudentAuthContextValue | null>(null);

async function authenticateWithInitData(initData: string) {
  const result = await api.post<TokenResponse>(
    "/api/v1/auth/telegram",
    { init_data: initData },
    { auth: "student", token: null },
  );
  setStudentToken(result.access_token);
  return result.student || null;
}

export function StudentAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [bootError, setBootError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [needsBypass, setNeedsBypass] = useState(false);

  const meQuery = useQuery({
    queryKey: ["student-me"],
    enabled: ready && Boolean(getStudentToken()),
    queryFn: () => api.get<Student>("/api/v1/auth/me", { auth: "student" }),
    retry: false,
  });

  const bootstrap = useCallback(async () => {
    setBootError(null);
    initTelegramWebApp();

    const existing = getStudentToken();
    if (existing) {
      setReady(true);
      return;
    }

    const initData = getTelegramInitData();
    if (initData) {
      try {
        await authenticateWithInitData(initData);
        setReady(true);
        return;
      } catch (err) {
        setBootError(
          err instanceof ApiError ? err.message : "Telegram auth muvaffaqiyatsiz",
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

    setBootError(
      "Telegram Mini App ichida oching yoki lokal rivojlantirish uchun NEXT_PUBLIC_TELEGRAM_BYPASS=true qo‘ying.",
    );
    setReady(true);
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!ready || meQuery.isLoading) return;
    const student = meQuery.data;
    if (!student) return;
    if (!student.group_id && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
    if (student.group_id && pathname === "/onboarding") {
      router.replace("/");
    }
  }, [ready, meQuery.data, meQuery.isLoading, pathname, router]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["student-me"] });
  }, [queryClient]);

  const logout = useCallback(() => {
    setStudentToken(null);
    queryClient.clear();
    setNeedsBypass(telegramBypassEnabled());
    setReady(true);
  }, [queryClient]);

  const value = useMemo(
    () => ({
      student: meQuery.data || null,
      isLoading: !ready || (Boolean(getStudentToken()) && meQuery.isLoading),
      refresh,
      logout,
    }),
    [meQuery.data, meQuery.isLoading, ready, refresh, logout],
  );

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <LoadingCards count={2} />
      </div>
    );
  }

  if (needsBypass && !getStudentToken()) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Lokal kirish (Telegram bypass)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-neutral-500">
              Backend TELEGRAM_AUTH_BYPASS=true bo‘lishi kerak. Demo talaba
              sifatida kirish.
            </p>
            <Button
              className="w-full"
              onClick={async () => {
                try {
                  await authenticateWithInitData(buildBypassInitData());
                  setNeedsBypass(false);
                  await queryClient.invalidateQueries({ queryKey: ["student-me"] });
                } catch (err) {
                  setBootError(
                    err instanceof ApiError
                      ? err.message
                      : "Bypass login muvaffaqiyatsiz",
                  );
                }
              }}
            >
              Demo student sifatida kirish
            </Button>
            {bootError ? (
              <p className="text-sm text-red-600">{bootError}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bootError && !getStudentToken()) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Kirish mumkin emas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">{bootError}</p>
            <Button className="mt-4" onClick={() => void bootstrap()}>
              Qayta urinish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) {
    throw new Error("useStudentAuth must be used within StudentAuthProvider");
  }
  return ctx;
}
