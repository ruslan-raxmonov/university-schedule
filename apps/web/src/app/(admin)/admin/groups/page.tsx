"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Faculty, Group, Paginated } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingCards } from "@/components/shared/query-state";
import { toast } from "sonner";

export default function GroupsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState({ faculty_id: "", name: "", code: "", year: "1", active: true });

  const faculties = useQuery({
    queryKey: ["faculties-opts"],
    queryFn: () => api.get<Paginated<Faculty>>("/api/v1/faculties", { auth: "admin", query: { page_size: 100 } }),
  });
  const listQuery = useQuery({
    queryKey: ["admin-groups", q],
    queryFn: () => api.get<Paginated<Group>>("/api/v1/groups", { auth: "admin", query: { q: q || undefined, page_size: 200, active: true } }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        faculty_id: Number(form.faculty_id),
        name: form.name,
        code: form.code,
        year: Number(form.year),
        active: form.active,
      };
      if (editing) return api.patch(`/api/v1/admin/groups/${editing.id}`, body, { auth: "admin" });
      return api.post("/api/v1/admin/groups", body, { auth: "admin" });
    },
    onSuccess: () => { toast.success("Saqlandi"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-groups"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/groups/${id}`, { auth: "admin" }),
    onSuccess: () => { toast.success("Faolsizlantirildi"); qc.invalidateQueries({ queryKey: ["admin-groups"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = useMemo(() => listQuery.data?.items || [], [listQuery.data]);

  return (
    <>
      <AdminTopbar title="Groups" onSearch={setQ} />
      <div className="space-y-4 p-4 lg:p-8">
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setForm({ faculty_id: "", name: "", code: "", year: "1", active: true }); setOpen(true); }}>
            Yangi guruh
          </Button>
        </div>
        {listQuery.isLoading ? <LoadingCards /> : null}
        {listQuery.isError ? <ErrorState message={listQuery.error instanceof Error ? listQuery.error.message : undefined} onRetry={() => listQuery.refetch()} /> : null}
        {!listQuery.isLoading && items.length === 0 ? <EmptyState title="Guruhlar yo‘q" /> : null}
        {items.length > 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Nomi</TableHead>
                  <TableHead>Fakultet</TableHead>
                  <TableHead>Kurs</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{g.code}</TableCell>
                    <TableCell>{g.name}</TableCell>
                    <TableCell>{g.faculty?.name || g.faculty_id}</TableCell>
                    <TableCell>{g.year}</TableCell>
                    <TableCell>{g.active ? "Ha" : "Yo‘q"}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditing(g);
                        setForm({ faculty_id: String(g.faculty_id), name: g.name, code: g.code, year: String(g.year), active: g.active });
                        setOpen(true);
                      }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm("Faolsizlantirish?")) deactivate.mutate(g.id); }}>Deactivate</Button>
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
          <DialogHeader><DialogTitle>{editing ? "Guruhni tahrirlash" : "Yangi guruh"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Fakultet</Label>
              <Select value={form.faculty_id || undefined} onValueChange={(v) => setForm((f) => ({ ...f, faculty_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  {faculties.data?.items.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nomi</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Kod</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
            <div><Label>Kurs</Label><Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} /></div>
            <div className="flex items-center justify-between"><Label>Aktiv</Label><Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} /></div>
          </div>
          <DialogFooter><Button disabled={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
