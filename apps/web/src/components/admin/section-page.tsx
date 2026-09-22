"use client";

import { AdminTopbar } from "@/components/admin/topbar";
import { EmptyState } from "@/components/shared/query-state";

export function AdminSectionPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <AdminTopbar title={title} />
      <main className="p-4 md:p-8">
        <EmptyState title={title} description={description} />
      </main>
    </>
  );
}
