"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SearchResults } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { roomLabel } from "@/lib/labels";
import { formatTime } from "@/lib/utils";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const searchQuery = useQuery({
    queryKey: ["search", debounced],
    enabled: debounced.length > 0,
    queryFn: () =>
      api.get<SearchResults>("/api/v1/search", {
        auth: "student",
        query: { q: debounced },
      }),
  });

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--maroon)]">
          Qidiruv
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
          Topish
        </h1>
        <p className="text-sm text-[var(--stone)]">Fan, o‘qituvchi yoki xona</p>
      </header>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Masalan: Programming, 204..."
        autoFocus
      />

      {!debounced ? (
        <EmptyState
          title="Qidiruvni boshlang"
          description="Kamida 1 ta belgi kiriting."
        />
      ) : null}

      {searchQuery.isLoading ? <LoadingCards /> : null}
      {searchQuery.isError ? (
        <ErrorState
          message={
            searchQuery.error instanceof Error
              ? searchQuery.error.message
              : undefined
          }
          onRetry={() => searchQuery.refetch()}
        />
      ) : null}

      {searchQuery.data ? (
        <div className="space-y-5">
          <ResultSection title="Fanlar">
            {searchQuery.data.subjects.map((s) => (
              <Card key={s.id} className="p-4">
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-neutral-500">{s.code}</p>
              </Card>
            ))}
            {searchQuery.data.subjects.length === 0 ? (
              <p className="text-sm text-neutral-500">Topilmadi</p>
            ) : null}
          </ResultSection>

          <ResultSection title="O‘qituvchilar">
            {searchQuery.data.teachers.map((t) => (
              <Card key={t.id} className="p-4">
                <p className="font-medium">{t.full_name}</p>
                <p className="text-sm text-neutral-500">
                  {t.department || "—"}
                </p>
              </Card>
            ))}
            {searchQuery.data.teachers.length === 0 ? (
              <p className="text-sm text-neutral-500">Topilmadi</p>
            ) : null}
          </ResultSection>

          <ResultSection title="Xonalar">
            {searchQuery.data.rooms.map((r) => (
              <Card key={r.id} className="p-4">
                <p className="font-medium">
                  {roomLabel(r.building, r.room_number)}
                </p>
                <p className="text-sm text-neutral-500">{r.room_type}</p>
              </Card>
            ))}
            {searchQuery.data.rooms.length === 0 ? (
              <p className="text-sm text-neutral-500">Topilmadi</p>
            ) : null}
          </ResultSection>

          <ResultSection title="Darslar">
            {searchQuery.data.schedules.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.subject?.name}</p>
                    <p className="text-sm text-neutral-500">
                      {s.date} · {formatTime(s.start_time)} —{" "}
                      {formatTime(s.end_time)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {roomLabel(s.room?.building, s.room?.room_number)}
                  </Badge>
                </div>
              </Card>
            ))}
            {searchQuery.data.schedules.length === 0 ? (
              <p className="text-sm text-neutral-500">Topilmadi</p>
            ) : null}
          </ResultSection>
        </div>
      ) : null}
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
