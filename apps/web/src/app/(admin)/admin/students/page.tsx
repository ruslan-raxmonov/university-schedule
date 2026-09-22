"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Group, Paginated, Student } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function StudentsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({
    telegram_id: "",
    telegram_username: "",
    full_name: "",
    group_id: "",
    is_active: true,
  });

  const groups = useQuery({
    queryKey: ["groups-opts"],
    queryFn: () =>
      api.get<Paginated<Group>>("/api/v1/groups", {
        auth: "admin",
        query: { page_size: 200, active: true },
      }),
  });

  const listQuery = useQuery({
    queryKey: ["admin-students", q],
    queryFn: () =>
      api.get<Paginated<Student>>("/api/v1/admin/students", {
        auth: "admin",
        query: { q: q || undefined, page_size: 100 },
      }),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.patch(
          `/api/v1/admin/students/${editing.id}`,
          {
            telegram_username: form.telegram_username || null,
            full_name: form.full_name,
            group_id: form.group_id ? Number(form.group_id) : null,
            is_active: form.is_active,
          },
          { auth: "admin" },
        );
      }
      return api.post(
        "/api/v1/admin/students",
        {
          telegram_id: Number(form.telegram_id),
          telegram_username: form.telegram_username || null,
          full_name: form.full_name,
          group_id: form.group_id ? Number(form.group_id) : null,
          is_active: form.is_active,
        },
        { auth: "admin" },
      );
    },
    onSuccess: () => {
      toast.success("Saqlandi");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = useMemo(() => listQuery.data?.items || [], [listQuery.data]);

  return (
    <>
      <AdminTopbar title="Students" onSearch={setQ} />
      <div className="space-y-4 p-4 lg:p-8">
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditing(null);
              setForm({
                telegram_id: "",
                telegram_username: "",
                full_name: "",
                group_id: "",
                is_active: true,
              });
              setOpen(true);
            }}
          >
            Yangi talaba
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
          <EmptyState title="Talabalar yo‘q" />
        ) : null}
        {items.length > 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead>Guruh</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.full_name}</TableCell>
                    <TableCell>
                      @{s.telegram_username || s.telegram_id}
                    </TableCell>
                    <TableCell>{s.group?.code || "—"}</TableCell>
                    <TableCell>{s.is_active ? "Ha" : "Yo‘q"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(s);
                          setForm({
                            telegram_id: String(s.telegram_id),
                            telegram_username: s.telegram_username || "",
                            full_name: s.full_name,
                            group_id: s.group_id ? String(s.group_id) : "",
                            is_active: s.is_active,
                          });
                          setOpen(true);
                        }}
                      >
                        Edit
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
            <DialogTitle>{editing ? "Tahrirlash" : "Yangi talaba"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing ? (
              <div>
                <Label>Telegram ID</Label>
                <Input
                  value={form.telegram_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telegram_id: e.target.value }))
                  }
                />
              </div>
            ) : null}
            <div>
              <Label>To‘liq ism</Label>
              <Input
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                value={form.telegram_username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telegram_username: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Guruh</Label>
              <Select
                value={form.group_id || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, group_id: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Yo‘q</SelectItem>
                  {groups.data?.items.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktiv</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
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
