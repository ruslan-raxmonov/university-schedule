"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, Room } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingCards } from "@/components/shared/query-state";
import { toast } from "sonner";

const empty = { building: "Main", room_number: "", floor: "", capacity: "", room_type: "classroom" };

export default function RoomsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState(empty);

  const listQuery = useQuery({
    queryKey: ["admin-rooms", q],
    queryFn: () => api.get<Paginated<Room>>("/api/v1/rooms", { auth: "admin", query: { q: q || undefined, page_size: 200 } }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        building: form.building,
        room_number: form.room_number,
        floor: form.floor ? Number(form.floor) : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        room_type: form.room_type || null,
      };
      if (editing) return api.patch(`/api/v1/admin/rooms/${editing.id}`, body, { auth: "admin" });
      return api.post("/api/v1/admin/rooms", body, { auth: "admin" });
    },
    onSuccess: () => { toast.success("Saqlandi"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-rooms"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/rooms/${id}`, { auth: "admin" }),
    onSuccess: () => { toast.success("Faolsizlantirildi"); qc.invalidateQueries({ queryKey: ["admin-rooms"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = useMemo(() => listQuery.data?.items || [], [listQuery.data]);

  return (
    <>
      <AdminTopbar title="Rooms" onSearch={setQ} />
      <div className="space-y-4 p-4 lg:p-8">
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>Yangi xona</Button>
        </div>
        {listQuery.isLoading ? <LoadingCards /> : null}
        {listQuery.isError ? <ErrorState message={listQuery.error instanceof Error ? listQuery.error.message : undefined} onRetry={() => listQuery.refetch()} /> : null}
        {!listQuery.isLoading && items.length === 0 ? <EmptyState title="Xonalar yo‘q" /> : null}
        {items.length > 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bino</TableHead>
                  <TableHead>Xona</TableHead>
                  <TableHead>Qavat</TableHead>
                  <TableHead>Sig‘im</TableHead>
                  <TableHead>Tur</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.building}</TableCell>
                    <TableCell>{r.room_number}</TableCell>
                    <TableCell>{r.floor ?? "—"}</TableCell>
                    <TableCell>{r.capacity ?? "—"}</TableCell>
                    <TableCell>{r.room_type || "—"}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditing(r);
                        setForm({ building: r.building, room_number: r.room_number, floor: r.floor != null ? String(r.floor) : "", capacity: r.capacity != null ? String(r.capacity) : "", room_type: r.room_type || "classroom" });
                        setOpen(true);
                      }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm("Faolsizlantirish?")) deactivate.mutate(r.id); }}>Deactivate</Button>
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
          <DialogHeader><DialogTitle>{editing ? "Tahrirlash" : "Yangi xona"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Bino</Label><Input value={form.building} onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))} /></div>
            <div><Label>Xona raqami</Label><Input value={form.room_number} onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))} /></div>
            <div><Label>Qavat</Label><Input type="number" value={form.floor} onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))} /></div>
            <div><Label>Sig‘im</Label><Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} /></div>
            <div><Label>Tur</Label><Input value={form.room_type} onChange={(e) => setForm((f) => ({ ...f, room_type: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button disabled={save.isPending} onClick={() => save.mutate()}>Saqlash</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
