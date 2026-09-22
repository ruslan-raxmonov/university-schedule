"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { api, setAdminToken } from "@/lib/api";
import type { TokenResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    try {
      const result = await api.post<TokenResponse>(
        "/api/v1/auth/admin/login",
        values,
        { auth: "admin", token: null },
      );
      setAdminToken(result.access_token);
      toast.success("Xush kelibsiz");
      router.replace("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login xatosi");
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="atmosphere relative flex min-h-dvh items-center justify-center px-4">
      <div className="absolute inset-x-0 top-0 h-48 bg-[var(--navy)]" />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-[0_24px_60px_rgba(8,49,83,0.18)]">
        <div className="border-b border-[var(--line)] bg-[var(--navy)] px-6 py-8 text-center text-white">
          <div className="mb-4 flex justify-center">
            <BrandLogo size={64} priority className="justify-center" />
          </div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Renessans
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">
            Admin · Jadval
          </p>
        </div>
        <form className="space-y-4 p-6" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-[var(--error)]">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Parol</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-[var(--error)]">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <Button className="w-full" disabled={loading}>
            {loading ? "Kirilmoqda..." : "Kirish"}
          </Button>
        </form>
      </div>
    </div>
  );
}
