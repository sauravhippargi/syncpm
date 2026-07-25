"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload transcript" },
  { href: "/history/transcripts", label: "Transcript history" },
  { href: "/history/jira", label: "Jira tickets" },
  { href: "/deadlines", label: "Deadlines" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-[6px] px-2 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-accent-tint text-accent"
                : "text-text-secondary hover:bg-page"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
