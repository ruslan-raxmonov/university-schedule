"use client";

import { useAppAuth } from "@/hooks/use-app-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherProfilePage() {
  const { teacher, logout } = useAppAuth();

  if (!teacher) return null;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--maroon)]">
          Ustoz
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
          Profil
        </h1>
      </header>

      <Card className="brand-rail-maroon">
        <CardHeader>
          <CardTitle>{teacher.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-[var(--stone)]">Kafedra:</span>{" "}
            {teacher.department || "—"}
          </p>
          <p>
            <span className="text-[var(--stone)]">Telegram:</span> @
            {teacher.telegram_username || "—"}
          </p>
          <p>
            <span className="text-[var(--stone)]">Email:</span>{" "}
            {teacher.email || "—"}
          </p>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={logout}>
        Chiqish
      </Button>
    </div>
  );
}
