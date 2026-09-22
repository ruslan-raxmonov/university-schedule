"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Notification, Paginated } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { format, parseISO } from "date-fns";

export default function AdminNotificationsPage() {
  const listQuery = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () =>
      api.get<Paginated<Notification>>("/api/v1/admin/notifications", {
        auth: "admin",
        query: { page_size: 100 },
      }),
  });

  return (
    <>
      <AdminTopbar title="Notifications" />
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
          <EmptyState title="Bildirishnomalar yo‘q" />
        ) : null}
        {listQuery.data && listQuery.data.items.length > 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaqt</TableHead>
                  <TableHead>Talaba</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Read</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data.items.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      {n.created_at
                        ? format(parseISO(n.created_at), "dd MMM HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>#{n.student_id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{n.title}</p>
                        <p className="max-w-md truncate text-xs text-neutral-500">
                          {n.message}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{n.type}</Badge>
                    </TableCell>
                    <TableCell>{n.delivery_status}</TableCell>
                    <TableCell>{n.is_read ? "Ha" : "Yo‘q"}</TableCell>
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
