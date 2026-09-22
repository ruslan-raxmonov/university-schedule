"use client";

import { AdminTopbar } from "@/components/admin/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admin-auth";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { data: admin } = useAdmin();

  return (
    <>
      <AdminTopbar title="Settings" />
      <div className="space-y-4 p-4 lg:p-8">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Admin hisobi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-neutral-500">Ism:</span>{" "}
              {admin?.full_name || "—"}
            </p>
            <p>
              <span className="text-neutral-500">Email:</span>{" "}
              {admin?.email || "—"}
            </p>
            <p className="flex items-center gap-2">
              <span className="text-neutral-500">Rol:</span>
              <Badge variant="secondary">{admin?.role || "—"}</Badge>
            </p>
            <p className="pt-4 text-neutral-500">
              API: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
