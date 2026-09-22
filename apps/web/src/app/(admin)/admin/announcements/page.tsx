"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Faculty, Group, Paginated } from "@/lib/types";
import { AdminTopbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [confirm, setConfirm] = useState(false);

  const faculties = useQuery({
    queryKey: ["faculties-ann"],
    queryFn: () =>
      api.get<Paginated<Faculty>>("/api/v1/faculties", {
        auth: "admin",
        query: { page_size: 100 },
      }),
  });
  const groups = useQuery({
    queryKey: ["groups-ann", facultyId],
    queryFn: () =>
      api.get<Paginated<Group>>("/api/v1/groups", {
        auth: "admin",
        query: {
          page_size: 200,
          active: true,
          faculty_id: facultyId || undefined,
        },
      }),
  });

  const send = useMutation({
    mutationFn: () =>
      api.post<{ sent: number }>(
        "/api/v1/admin/announcements",
        {
          title,
          message,
          faculty_id: facultyId ? Number(facultyId) : null,
          group_id: groupId ? Number(groupId) : null,
          confirm,
        },
        { auth: "admin" },
      ),
    onSuccess: (data) => {
      toast.success(`${data.sent} ta talabaga yuborildi`);
      setTitle("");
      setMessage("");
      setConfirm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <AdminTopbar title="Announcements" />
      <div className="p-4 lg:p-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>E’lon yuborish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sarlavha</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Matn</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>
            <div>
              <Label>Fakultet (ixtiyoriy)</Label>
              <Select
                value={facultyId || "all"}
                onValueChange={(v) => {
                  setFacultyId(v === "all" ? "" : v);
                  setGroupId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Barcha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha talabalar</SelectItem>
                  {faculties.data?.items.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Guruh (ixtiyoriy)</Label>
              <Select
                value={groupId || "all"}
                onValueChange={(v) => setGroupId(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Barcha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Fakultet / hammasi</SelectItem>
                  {groups.data?.items.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <Label>Yuborishni tasdiqlayman</Label>
              <Switch checked={confirm} onCheckedChange={setConfirm} />
            </div>
            <Button
              disabled={
                !title || !message || !confirm || send.isPending
              }
              onClick={() => send.mutate()}
            >
              E’lonni yuborish
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
