"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  History,
  Info,
  LayoutDashboard,
  ListChecks,
  Ticket,
  Upload,
  type LucideIcon,
} from "lucide-react";
import HowToUseModal from "./HowToUseModal";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Transcript", icon: Upload },
  { href: "/history/transcripts", label: "Transcript History", icon: History },
  { href: "/action-items", label: "Action Items", icon: ListChecks },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [howToUseOpen, setHowToUseOpen] = useState(false);

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
              isActive ? "bg-accent-tint" : "text-text-secondary hover:bg-page"
            }`}
          >
            <Icon
              size={16}
              className={`shrink-0 ${isActive ? "text-accent" : ""}`}
            />
            <span className={isActive ? "text-sidebar-selected-text" : ""}>
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Not a route — opens a static reference modal, so it never shows
          an active state like the links above (prd.md sidebar spec). */}
      <button
        type="button"
        onClick={() => setHowToUseOpen(true)}
        className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] font-medium text-text-secondary transition-colors hover:bg-page"
      >
        <Info size={16} className="shrink-0" />
        <span>How to Use</span>
      </button>

      {howToUseOpen && (
        <HowToUseModal onClose={() => setHowToUseOpen(false)} />
      )}
    </nav>
  );
}
