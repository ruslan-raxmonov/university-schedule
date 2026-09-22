"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Student } from "@/lib/types";
import { useStudentAuth } from "@/hooks/use-student-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ProfilePage() {
  const { student, logout, refresh } = useStudentAuth();
  const queryClient = useQueryClient();

  const updatePrefs = useMutation({
    mutationFn: (body: Partial<Student>) =>
      api.patch<Student>("/api/v1/students/me", body, { auth: "student" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student-me"] });
      await refresh();
      toast.success("Sozlamalar saqlandi");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!student) return null;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--maroon)]">
          Hisob
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
          Profil
        </h1>
        <p className="text-sm text-[var(--stone)]">Shaxsiy ma’lumotlar</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{student.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-neutral-500">Telegram:</span> @
            {student.telegram_username || "—"}
          </p>
          <p>
            <span className="text-neutral-500">Guruh:</span>{" "}
            {student.group?.code || "Tanlanmagan"}
          </p>
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href="/onboarding">Guruhni o‘zgartirish</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bildirishnoma sozlamalari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PrefRow
            label="Jadval o‘zgarishlari"
            checked={student.notify_schedule_changes}
            onChange={(v) =>
              updatePrefs.mutate({ notify_schedule_changes: v })
            }
          />
          <Separator />
          <PrefRow
            label="Bekor qilingan darslar"
            checked={student.notify_cancellations}
            onChange={(v) => updatePrefs.mutate({ notify_cancellations: v })}
          />
          <Separator />
          <PrefRow
            label="Xona o‘zgarishlari"
            checked={student.notify_room_changes}
            onChange={(v) => updatePrefs.mutate({ notify_room_changes: v })}
          />
          <Separator />
          <PrefRow
            label="E’lonlar"
            checked={student.notify_announcements}
            onChange={(v) => updatePrefs.mutate({ notify_announcements: v })}
          />
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={logout}>
        Chiqish
      </Button>
    </div>
  );
}

function PrefRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
