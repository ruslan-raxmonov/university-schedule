"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Home,
  Search,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Bosh", icon: Home },
  { href: "/schedule", label: "Jadval", icon: CalendarDays },
  { href: "/search", label: "Qidiruv", icon: Search },
  { href: "/notifications", label: "Yangilik", icon: Bell },
  { href: "/profile", label: "Profil", icon: UserRound },
];

export function StudentBottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/onboarding") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--card)_92%,transparent)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  active ? "text-[var(--maroon)]" : "text-[var(--stone)]",
                )}
              >
                {active ? (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--gold)]" />
                ) : null}
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
