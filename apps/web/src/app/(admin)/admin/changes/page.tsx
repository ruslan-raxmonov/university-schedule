"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, ScheduleChange } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { format, parseISO } from "date-fns";

export default function ChangesPage() {
  const listQuery = useQuery({
    queryKey: ["admin-changes"],
    queryFn: () =>
      api.get<Paginated<ScheduleChange>>("/api/v1/admin/changes", {
        auth: "admin",
        query: { page_size: 100 },
      }),
  });

  return (
    <>
      <AdminTopbar title="Changes" />
      <div className="space-y-4 p-4 lg:p-8">
        {listQuery.isLoading ? <LoadingCards /> : null}
        {listQuery.isError ? (
          <ErrorState
            message={
              listQuery.error instanceof Error
                ? listQuery.error.message
                : undefined
            }
            onRetry={() => listQuery.refetch()}
          />
        ) : null}
        {listQuery.data && listQuery.data.items.length === 0 ? (
          <EmptyState title="O‘zgarishlar yo‘q" />
        ) : null}
        {listQuery.data && listQuery.data.items.length > 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaqt</TableHead>
                  <TableHead>Tur</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Sabab</TableHead>
                  <TableHead>Old</TableHead>
                  <TableHead>New</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.created_at
                        ? format(parseISO(c.created_at), "dd MMM HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>{c.change_type}</TableCell>
                    <TableCell>#{c.schedule_id}</TableCell>
                    <TableCell>{c.reason || "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs">
                      {JSON.stringify(c.old_value)}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs">
                      {JSON.stringify(c.new_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </div>
    </>
  );
}
