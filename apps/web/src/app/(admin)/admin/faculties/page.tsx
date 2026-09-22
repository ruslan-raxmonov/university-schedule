"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Faculty, Paginated } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

export default function FacultiesPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const listQuery = useQuery({
    queryKey: ["admin-faculties", q],
    queryFn: () =>
      api.get<Paginated<Faculty>>("/api/v1/faculties", {
        auth: "admin",
        query: { q: q || undefined, page_size: 100 },
      }),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        code: form.code,
        description: form.description || null,
      };
      if (editing) {
        return api.patch(`/api/v1/admin/faculties/${editing.id}`, body, {
          auth: "admin",
        });
      }
      return api.post("/api/v1/admin/faculties", body, { auth: "admin" });
    },
    onSuccess: () => {
      toast.success("Saqlandi");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-faculties"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      api.delete(`/api/v1/admin/faculties/${id}`, { auth: "admin" }),
    onSuccess: () => {
      toast.success("O‘chirildi");
      queryClient.invalidateQueries({ queryKey: ["admin-faculties"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = useMemo(() => listQuery.data?.items || [], [listQuery.data]);

  return (
    <>
      <AdminTopbar title="Faculties" onSearch={setQ} />
      <div className="space-y-4 p-4 lg:p-8">
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ name: "", code: "", description: "" });
              setOpen(true);
            }}
          >
            Yangi fakultet
          </Button>
        </div>
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
        {!listQuery.isLoading && items.length === 0 ? (
          <EmptyState title="Fakultetlar yo‘q" />
        ) : null}
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
                {items.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.code}</TableCell>
                    <TableCell>{f.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {f.description || "—"}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(f);
                          setForm({
                            name: f.name,
                            code: f.code,
                            description: f.description || "",
                          });
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("O‘chirish?")) remove.mutate(f.id);
                        }}
                      >
                        Delete
                      </Button>
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
          <DialogHeader>
            <DialogTitle>
              {editing ? "Fakultetni tahrirlash" : "Yangi fakultet"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nomi</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Kod</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tavsif</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
