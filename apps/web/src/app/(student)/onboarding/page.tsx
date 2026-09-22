"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Faculty, Group, Paginated, Student } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { toast } from "sonner";
import { useStudentAuth } from "@/hooks/use-student-auth";

export default function OnboardingPage() {
  const router = useRouter();
  const { refresh } = useStudentAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [facultyId, setFacultyId] = useState<number | null>(null);

  const facultiesQuery = useQuery({
    queryKey: ["faculties"],
    queryFn: () =>
      api.get<Paginated<Faculty>>("/api/v1/faculties", {
        auth: "student",
        query: { page_size: 100 },
      }),
  });

  const groupsQuery = useQuery({
    queryKey: ["groups", facultyId, q],
    queryFn: () =>
      api.get<Paginated<Group>>("/api/v1/groups", {
        auth: "student",
        query: {
          page_size: 200,
          active: true,
          faculty_id: facultyId || undefined,
          q: q || undefined,
        },
      }),
  });

  const selectGroup = useMutation({
    mutationFn: (group_id: number) =>
      api.patch<Student>(
        "/api/v1/students/me",
        { group_id },
        { auth: "student" },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student-me"] });
      await refresh();
      toast.success("Guruh saqlandi");
      router.replace("/");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const groups = useMemo(() => groupsQuery.data?.items || [], [groupsQuery.data]);

  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-2 pt-4 text-center">
        <p className="text-3xl">🎓</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Dars jadvalingiz
        </h1>
        <p className="text-sm text-neutral-500">
          Jadvalni ko‘rish uchun guruhingizni tanlang.
        </p>
      </header>

      <Input
        placeholder="Guruhni qidirish (CS-24-01...)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={facultyId === null ? "default" : "outline"}
          onClick={() => setFacultyId(null)}
        >
          Barchasi
        </Button>
        {facultiesQuery.data?.items.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={facultyId === f.id ? "default" : "outline"}
            onClick={() => setFacultyId(f.id)}
          >
            {f.code}
          </Button>
        ))}
      </div>

      {groupsQuery.isLoading ? <LoadingCards /> : null}
      {groupsQuery.isError ? (
        <ErrorState
          message={
            groupsQuery.error instanceof Error
              ? groupsQuery.error.message
              : undefined
          }
          onRetry={() => groupsQuery.refetch()}
        />
      ) : null}
      {!groupsQuery.isLoading && groups.length === 0 ? (
        <EmptyState title="Guruh topilmadi" />
      ) : null}

      <div className="space-y-2">
        {groups.map((g) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{g.code}</p>
                <p className="text-sm text-neutral-500">
                  {g.faculty?.name || g.name} · {g.year}-kurs
                </p>
              </div>
              <Button
                size="sm"
                disabled={selectGroup.isPending}
                onClick={() => selectGroup.mutate(g.id)}
              >
                Tanlash
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
