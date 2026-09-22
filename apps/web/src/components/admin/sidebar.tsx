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
import { useState } from "react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/schedules", label: "Schedules", icon: CalendarClock },
  { href: "/admin/groups", label: "Groups", icon: Users },
  { href: "/admin/students", label: "Students", icon: UserRound },
  { href: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/admin/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/admin/faculties", label: "Faculties", icon: Building2 },
  { href: "/admin/import", label: "Import", icon: Upload },
  { href: "/admin/changes", label: "Changes", icon: History },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/audit", label: "Audit", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 p-3">
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
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900",
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
      <aside className="hidden w-64 shrink-0 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 lg:block">
        <div className="flex h-14 items-center border-b border-neutral-200 px-5 dark:border-neutral-800">
          <p className="font-semibold tracking-tight">Uni Schedule</p>
        </div>
        <NavLinks />
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Chiqish
          </Button>
        </div>
      </aside>

      <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-4 lg:hidden dark:border-neutral-800">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-14 items-center border-b px-5 font-semibold">
              Uni Schedule
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <p className="font-semibold">Admin</p>
      </div>
    </>
  );
}
