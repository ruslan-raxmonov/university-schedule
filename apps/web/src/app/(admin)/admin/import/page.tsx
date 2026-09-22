"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { ImportPreviewResult } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/query-state";
import { toast } from "sonner";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [allowPartial, setAllowPartial] = useState(false);
  const [busy, setBusy] = useState(false);

  const runPreview = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await api.upload<ImportPreviewResult>(
        "/api/v1/import/schedule/preview",
        fd,
        { auth: "admin" },
      );
      setPreview(data);
      toast.success("Preview tayyor");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview xatosi");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await api.upload<{ imported?: number; created?: number }>(
        `/api/v1/import/schedule?allow_partial=${allowPartial}`,
        fd,
        { auth: "admin" },
      );
      toast.success(
        `Import yakunlandi: ${JSON.stringify(data)}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import xatosi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminTopbar title="Import" />
      <div className="space-y-6 p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Excel / CSV jadval import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputFile onChange={setFile} />
            <div className="flex items-center gap-3">
              <Switch checked={allowPartial} onCheckedChange={setAllowPartial} />
              <Label>Partial import (xatoli qatorlarni o‘tkazib yuborish)</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!file || busy} onClick={runPreview}>
                Preview
              </Button>
              <Button
                disabled={!file || busy || (preview ? !preview.can_import && !allowPartial : false)}
                onClick={runImport}
              >
                Import qilish
              </Button>
            </div>
          </CardContent>
        </Card>

        {!preview ? (
          <EmptyState
            title="Fayl tanlang"
            description="Avval preview qiling, keyin import."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Preview · {preview.valid_rows}/{preview.total_rows} valid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2 text-sm">
                <Badge variant="success">Valid: {preview.valid_rows}</Badge>
                <Badge variant="destructive">Errors: {preview.error_rows}</Badge>
                <Badge variant="warning">Warnings: {preview.warning_rows}</Badge>
              </div>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Xatolar</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.slice(0, 50).map((row) => (
                      <TableRow key={row.row_number}>
                        <TableCell>{row.row_number}</TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge variant="success">OK</Badge>
                          ) : (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs text-xs">
                          {[...row.errors, ...row.warnings].join("; ") || "—"}
                        </TableCell>
                        <TableCell className="max-w-sm truncate text-xs">
                          {JSON.stringify(row.data)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function InputFile({ onChange }: { onChange: (f: File | null) => void }) {
  return (
    <input
      type="file"
      accept=".xlsx,.xls,.csv"
      className="block w-full text-sm"
      onChange={(e) => onChange(e.target.files?.[0] || null)}
    />
  );
}
