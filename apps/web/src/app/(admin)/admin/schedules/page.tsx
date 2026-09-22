"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, ApiError } from "@/lib/api";
import type {
  ConflictInfo,
  Group,
  Paginated,
  Room,
  Schedule,
  Subject,
  Teacher,
} from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/shared/query-state";
import { formatTime } from "@/lib/utils";
import { roomLabel } from "@/lib/labels";
import { toast } from "sonner";

const schema = z.object({
  group_id: z.string().min(1),
  subject_id: z.string().min(1),
  teacher_id: z.string().min(1),
  room_id: z.string().min(1),
  date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  lesson_type: z.string().min(1),
  status: z.string().min(1),
  notes: z.string().optional(),
  reason: z.string().optional(),
  notify: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function AdminSchedulesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [force, setForce] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    group_id: "",
  });

  const listQuery = useQuery({
    queryKey: ["admin-schedules", filters],
    queryFn: () =>
      api.get<Paginated<Schedule>>("/api/v1/admin/schedules", {
        auth: "admin",
        query: {
          page_size: 100,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          group_id: filters.group_id || undefined,
        },
      }),
  });

  const groups = useQuery({
    queryKey: ["admin-groups-opts"],
    queryFn: () =>
      api.get<Paginated<Group>>("/api/v1/groups", {
        auth: "admin",
        query: { page_size: 200, active: true },
      }),
  });
  const subjects = useQuery({
    queryKey: ["admin-subjects-opts"],
    queryFn: () =>
      api.get<Paginated<Subject>>("/api/v1/subjects", {
        auth: "admin",
        query: { page_size: 200 },
      }),
  });
  const teachers = useQuery({
    queryKey: ["admin-teachers-opts"],
    queryFn: () =>
      api.get<Paginated<Teacher>>("/api/v1/teachers", {
        auth: "admin",
        query: { page_size: 200 },
      }),
  });
  const rooms = useQuery({
    queryKey: ["admin-rooms-opts"],
    queryFn: () =>
      api.get<Paginated<Room>>("/api/v1/rooms", {
        auth: "admin",
        query: { page_size: 200 },
      }),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      group_id: "",
      subject_id: "",
      teacher_id: "",
      room_id: "",
      date: "",
      start_time: "09:00",
      end_time: "10:20",
      lesson_type: "lecture",
      status: "scheduled",
      notes: "",
      reason: "",
      notify: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = {
        group_id: Number(values.group_id),
        subject_id: Number(values.subject_id),
        teacher_id: Number(values.teacher_id),
        room_id: Number(values.room_id),
        date: values.date,
        start_time: values.start_time.length === 5 ? `${values.start_time}:00` : values.start_time,
        end_time: values.end_time.length === 5 ? `${values.end_time}:00` : values.end_time,
        lesson_type: values.lesson_type,
        status: values.status,
        notes: values.notes || null,
        reason: values.reason || null,
        notify: values.notify,
        force,
      };
      if (editing) {
        return api.patch<Schedule>(`/api/v1/admin/schedules/${editing.id}`, body, {
          auth: "admin",
        });
      }
      return api.post<Schedule>("/api/v1/admin/schedules", body, { auth: "admin" });
    },
    onSuccess: () => {
      toast.success(editing ? "Jadval yangilandi" : "Dars qo‘shildi");
      setOpen(false);
      setEditing(null);
      setForce(false);
      setConflicts([]);
      queryClient.invalidateQueries({ queryKey: ["admin-schedules"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        const data = err.data as { conflicts?: ConflictInfo[] } | null;
        setConflicts(data?.conflicts || []);
        toast.error("Konflikt aniqlandi");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Xatolik");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete(`/api/v1/admin/schedules/${id}`, { auth: "admin" }),
    onSuccess: () => {
      toast.success("O‘chirildi");
      queryClient.invalidateQueries({ queryKey: ["admin-schedules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForce(false);
    setConflicts([]);
    form.reset({
      group_id: "",
      subject_id: "",
      teacher_id: "",
      room_id: "",
      date: "",
      start_time: "09:00",
      end_time: "10:20",
      lesson_type: "lecture",
      status: "scheduled",
      notes: "",
      reason: "",
      notify: true,
    });
    setOpen(true);
  };

  const openEdit = (s: Schedule) => {
    setEditing(s);
    setForce(false);
    setConflicts([]);
    form.reset({
      group_id: String(s.group_id),
      subject_id: String(s.subject_id),
      teacher_id: String(s.teacher_id),
      room_id: String(s.room_id),
      date: s.date,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      lesson_type: s.lesson_type,
      status: s.status,
      notes: s.notes || "",
      reason: "",
      notify: true,
    });
    setOpen(true);
  };

  const items = useMemo(() => listQuery.data?.items || [], [listQuery.data]);

  return (
    <>
      <AdminTopbar title="Schedules" />
      <div className="space-y-4 p-4 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Dan</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, date_from: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Gacha</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, date_to: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Guruh</Label>
              <Select
                value={filters.group_id || "all"}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, group_id: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Barchasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barchasi</SelectItem>
                  {groups.data?.items.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={openCreate}>Yangi dars</Button>
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
          <EmptyState title="Jadval bo‘sh" />
        ) : null}

        {items.length > 0 ? (
          <div className="rounded-2xl border bg-white dark:bg-neutral-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sana</TableHead>
                  <TableHead>Vaqt</TableHead>
                  <TableHead>Fan</TableHead>
                  <TableHead>Guruh</TableHead>
                  <TableHead>Xona</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>
                      {formatTime(s.start_time)}–{formatTime(s.end_time)}
                    </TableCell>
                    <TableCell>{s.subject?.name}</TableCell>
                    <TableCell>{s.group?.code}</TableCell>
                    <TableCell>
                      {roomLabel(s.room?.building, s.room?.room_number)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.status}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("O‘chirishni tasdiqlaysizmi?")) {
                            deleteMutation.mutate(s.id);
                          }
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Darsni tahrirlash" : "Yangi dars"}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldSelect
                label="Guruh"
                value={form.watch("group_id")}
                onChange={(v) => form.setValue("group_id", v)}
                options={
                  groups.data?.items.map((g) => ({
                    value: String(g.id),
                    label: g.code,
                  })) || []
                }
              />
              <FieldSelect
                label="Fan"
                value={form.watch("subject_id")}
                onChange={(v) => form.setValue("subject_id", v)}
                options={
                  subjects.data?.items.map((s) => ({
                    value: String(s.id),
                    label: s.name,
                  })) || []
                }
              />
              <FieldSelect
                label="O‘qituvchi"
                value={form.watch("teacher_id")}
                onChange={(v) => form.setValue("teacher_id", v)}
                options={
                  teachers.data?.items.map((t) => ({
                    value: String(t.id),
                    label: t.full_name,
                  })) || []
                }
              />
              <FieldSelect
                label="Xona"
                value={form.watch("room_id")}
                onChange={(v) => form.setValue("room_id", v)}
                options={
                  rooms.data?.items.map((r) => ({
                    value: String(r.id),
                    label: roomLabel(r.building, r.room_number),
                  })) || []
                }
              />
              <div>
                <Label>Sana</Label>
                <Input type="date" {...form.register("date")} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Boshlanish</Label>
                  <Input type="time" {...form.register("start_time")} />
                </div>
                <div>
                  <Label>Tugash</Label>
                  <Input type="time" {...form.register("end_time")} />
                </div>
              </div>
              <FieldSelect
                label="Tur"
                value={form.watch("lesson_type")}
                onChange={(v) => form.setValue("lesson_type", v)}
                options={[
                  { value: "lecture", label: "lecture" },
                  { value: "seminar", label: "seminar" },
                  { value: "practical", label: "practical" },
                  { value: "laboratory", label: "laboratory" },
                  { value: "other", label: "other" },
                ]}
              />
              <FieldSelect
                label="Status"
                value={form.watch("status")}
                onChange={(v) => form.setValue("status", v)}
                options={[
                  { value: "scheduled", label: "scheduled" },
                  { value: "cancelled", label: "cancelled" },
                  { value: "moved", label: "moved" },
                  { value: "completed", label: "completed" },
                ]}
              />
            </div>
            <div>
              <Label>Izoh</Label>
              <Textarea {...form.register("notes")} />
            </div>
            <div>
              <Label>Sabab (notify uchun)</Label>
              <Input {...form.register("reason")} placeholder="Room maintenance" />
            </div>

            {conflicts.length > 0 ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Konfliktlar:
                </p>
                <ul className="mt-1 list-disc pl-5 text-amber-700 dark:text-amber-300">
                  {conflicts.map((c, i) => (
                    <li key={i}>{c.message}</li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setForce(true)}
                >
                  Force save
                </Button>
                {force ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Force yoqilgan — keyingi saqlash konfliktni e’tiborsiz qoldiradi.
                  </p>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editing ? "Save & Notify Students" : "Saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Tanlang" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
