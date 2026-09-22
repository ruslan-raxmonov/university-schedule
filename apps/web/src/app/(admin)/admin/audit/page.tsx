"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditLog, Paginated } from "@/lib/types";
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

export default function AuditPage() {
  const listQuery = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () =>
      api.get<Paginated<AuditLog>>("/api/v1/admin/audit", {
        auth: "admin",
        query: { page_size: 100 },
      }),
  });

  return (
    <>
      <AdminTopbar title="Audit log" />
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
          <EmptyState title="Audit yozuvlari yo‘q" />
        ) : null}
        {listQuery.data && listQuery.data.items.length > 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaqt</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {a.created_at
                        ? format(parseISO(a.created_at), "dd MMM HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>#{a.admin_user_id ?? "—"}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell>
                      {a.entity_type}
                      {a.entity_id ? ` #${a.entity_id}` : ""}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs">
                      {JSON.stringify(a.metadata)}
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
