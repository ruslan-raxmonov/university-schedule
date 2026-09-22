"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboardPage() {
  const dashQuery = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () =>
      api.get<DashboardStats>("/api/v1/admin/dashboard", { auth: "admin" }),
  });

  const stats = dashQuery.data;
  const chartData = [
    { name: "Students", value: stats?.total_students || 0 },
    { name: "Groups", value: stats?.total_groups || 0 },
    { name: "Teachers", value: stats?.total_teachers || 0 },
    { name: "Today", value: stats?.todays_classes || 0 },
    { name: "Cancelled", value: stats?.cancelled_today || 0 },
  ];

  return (
    <>
      <AdminTopbar title="Dashboard" />
      <div className="space-y-6 p-4 lg:p-8">
        {dashQuery.isLoading ? <LoadingCards count={4} /> : null}
        {dashQuery.isError ? (
          <ErrorState
            message={
              dashQuery.error instanceof Error
                ? dashQuery.error.message
                : undefined
            }
            onRetry={() => dashQuery.refetch()}
          />
        ) : null}

        {stats ? (
          <>
            {stats.message ? (
              <EmptyState title={stats.message} />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Talabalar" value={stats.total_students} />
              <StatCard label="Guruhlar" value={stats.total_groups} />
              <StatCard label="O‘qituvchilar" value={stats.total_teachers} />
              <StatCard label="Bugungi darslar" value={stats.todays_classes} />
              <StatCard
                label="Bugun bekor"
                value={stats.cancelled_today}
                tone="warning"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Umumiy ko‘rsatkichlar</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7a1515" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Bugungi jadval</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.todays_schedules.length === 0 ? (
                    <EmptyState title="Bugun dars yo‘q" />
                  ) : (
                    stats.todays_schedules.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-xl border p-3"
                      >
                        <div>
                          <p className="font-medium">{s.subject?.name}</p>
                          <p className="text-sm text-neutral-500">
                            {s.group?.code} · {formatTime(s.start_time)}—
                            {formatTime(s.end_time)}
                          </p>
                        </div>
                        <Badge variant="secondary">{s.status}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>So‘nggi o‘zgarishlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.recent_changes.length === 0 ? (
                    <EmptyState title="O‘zgarishlar yo‘q" />
                  ) : (
                    stats.recent_changes.map((c) => (
                      <div key={c.id} className="rounded-xl border p-3 text-sm">
                        <p className="font-medium">{c.change_type}</p>
                        <p className="text-neutral-500">
                          Schedule #{c.schedule_id}
                          {c.reason ? ` · ${c.reason}` : ""}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning";
}) {
  return (
    <Card className="brand-rail overflow-hidden">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--stone)]">
          {label}
        </p>
        <p
          className={`mt-2 font-display text-3xl font-bold tracking-tight ${
            tone === "warning" ? "text-[var(--warning)]" : "text-[var(--ink)]"
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
