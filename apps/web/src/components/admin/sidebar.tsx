"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Upload,
  Users,
  BookOpen,
  UserRound,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setAdminToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/brand-logo";
import { useState } from "react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/schedules", label: "Jadval", icon: CalendarClock },
  { href: "/admin/groups", label: "Guruhlar", icon: Users },
  { href: "/admin/students", label: "Talabalar", icon: UserRound },
  { href: "/admin/subjects", label: "Fanlar", icon: BookOpen },
  { href: "/admin/teachers", label: "O‘qituvchilar", icon: GraduationCap },
  { href: "/admin/rooms", label: "Auditoriyalar", icon: DoorOpen },
  { href: "/admin/faculties", label: "Fakultetlar", icon: Building2 },
  { href: "/admin/import", label: "Import", icon: Upload },
  { href: "/admin/changes", label: "O‘zgarishlar", icon: History },
  { href: "/admin/notifications", label: "Bildirishnomalar", icon: Bell },
  { href: "/admin/announcements", label: "E’lonlar", icon: Megaphone },
  { href: "/admin/audit", label: "Audit", icon: ClipboardList },
  { href: "/admin/settings", label: "Sozlamalar", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5 p-3">
      {nav.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-[var(--maroon)] text-white"
                : "text-white/75 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = () => {
    setAdminToken(null);
    router.replace("/admin/login");
  };

  return (
    <>
      <aside className="hidden w-64 shrink-0 bg-[var(--navy)] text-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <BrandLogo size={36} light withWordmark />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t border-white/10 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Chiqish
          </Button>
        </div>
      </aside>

      <div className="flex h-14 items-center gap-2 border-b border-[var(--line)] bg-[var(--navy)] px-4 text-white lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-0 bg-[var(--navy)] p-0 text-white">
            <div className="flex h-14 items-center border-b border-white/10 px-5">
              <BrandLogo size={32} light withWordmark />
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <BrandLogo size={28} light withWordmark />
      </div>
    </>
  );
}
