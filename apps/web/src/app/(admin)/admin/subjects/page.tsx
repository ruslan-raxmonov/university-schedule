"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, Subject } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingCards } from "@/components/shared/query-state";
import { toast } from "sonner";

export default function SubjectsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const listQuery = useQuery({
    queryKey: ["admin-subjects", q],
    queryFn: () => api.get<Paginated<Subject>>("/api/v1/subjects", { auth: "admin", query: { q: q || undefined, page_size: 200 } }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: form.name, code: form.code, description: form.description || null };
      if (editing) return api.patch(`/api/v1/admin/subjects/${editing.id}`, body, { auth: "admin" });
      return api.post("/api/v1/admin/subjects", body, { auth: "admin" });
    },
    onSuccess: () => { toast.success("Saqlandi"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/subjects/${id}`, { auth: "admin" }),
    onSuccess: () => { toast.success("Faolsizlantirildi"); qc.invalidateQueries({ queryKey: ["admin-subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = useMemo(() => listQuery.data?.items || [], [listQuery.data]);

  return (
    <>
      <AdminTopbar title="Subjects" onSearch={setQ} />
      <div className="space-y-4 p-4 lg:p-8">
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setForm({ name: "", code: "", description: "" }); setOpen(true); }}>Yangi fan</Button>
        </div>
        {listQuery.isLoading ? <LoadingCards /> : null}
        {listQuery.isError ? <ErrorState message={listQuery.error instanceof Error ? listQuery.error.message : undefined} onRetry={() => listQuery.refetch()} /> : null}
        {!listQuery.isLoading && items.length === 0 ? <EmptyState title="Fanlar yo‘q" /> : null}
        {items.length > 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Nomi</TableHead>
                  <TableHead>Tavsif</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{s.description || "—"}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(s); setForm({ name: s.name, code: s.code, description: s.description || "" }); setOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm("Faolsizlantirish?")) deactivate.mutate(s.id); }}>Deactivate</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Tahrirlash" : "Yangi fan"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nomi</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Kod</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
            <div><Label>Tavsif</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button disabled={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
