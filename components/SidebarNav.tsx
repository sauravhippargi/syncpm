"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  History,
  LayoutDashboard,
  ListChecks,
  Ticket,
  Upload,
  type LucideIcon,
} from "lucide-react";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload transcript", icon: Upload },
  { href: "/history/transcripts", label: "Transcript history", icon: History },
  { href: "/action-items", label: "Action items", icon: ListChecks },
  { href: "/raise-a-ticket", label: "Raise a ticket", icon: Ticket },
  { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-accent-tint text-accent"
                : "text-text-secondary hover:bg-page"
            }`}
          >
            <Icon size={16} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
