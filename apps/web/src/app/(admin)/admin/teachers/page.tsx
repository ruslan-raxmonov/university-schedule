"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, Teacher } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingCards } from "@/components/shared/query-state";
import { toast } from "sonner";

const empty = { full_name: "", short_name: "", email: "", phone: "", department: "" };

export default function TeachersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState(empty);

  const listQuery = useQuery({
    queryKey: ["admin-teachers", q],
    queryFn: () => api.get<Paginated<Teacher>>("/api/v1/teachers", { auth: "admin", query: { q: q || undefined, page_size: 200 } }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, email: form.email || null, phone: form.phone || null, short_name: form.short_name || null, department: form.department || null };
      if (editing) return api.patch(`/api/v1/admin/teachers/${editing.id}`, body, { auth: "admin" });
      return api.post("/api/v1/admin/teachers", body, { auth: "admin" });
    },
    onSuccess: () => { toast.success("Saqlandi"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-teachers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/teachers/${id}`, { auth: "admin" }),
    onSuccess: () => { toast.success("Faolsizlantirildi"); qc.invalidateQueries({ queryKey: ["admin-teachers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = useMemo(() => listQuery.data?.items || [], [listQuery.data]);

  return (
    <>
      <AdminTopbar title="Teachers" onSearch={setQ} />
      <div className="space-y-4 p-4 lg:p-8">
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>Yangi o‘qituvchi</Button>
        </div>
        {listQuery.isLoading ? <LoadingCards /> : null}
        {listQuery.isError ? <ErrorState message={listQuery.error instanceof Error ? listQuery.error.message : undefined} onRetry={() => listQuery.refetch()} /> : null}
        {!listQuery.isLoading && items.length === 0 ? <EmptyState title="O‘qituvchilar yo‘q" /> : null}
        {items.length > 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Bo‘lim</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.full_name}</TableCell>
                    <TableCell>{t.department || "—"}</TableCell>
                    <TableCell>{t.email || "—"}</TableCell>
                    <TableCell>{t.phone || "—"}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditing(t);
                        setForm({ full_name: t.full_name, short_name: t.short_name || "", email: t.email || "", phone: t.phone || "", department: t.department || "" });
                        setOpen(true);
                      }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm("Faolsizlantirish?")) deactivate.mutate(t.id); }}>Deactivate</Button>
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
          <DialogHeader><DialogTitle>{editing ? "Tahrirlash" : "Yangi o‘qituvchi"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(["full_name","short_name","email","phone","department"] as const).map((key) => (
              <div key={key}>
                <Label>{key}</Label>
                <Input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter><Button disabled={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
