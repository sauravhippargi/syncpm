"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import SidebarNav from "./SidebarNav";
import SignOutButton from "./SignOutButton";

// Below md, the persistent Sidebar is hidden (see Sidebar.tsx) and this
// slim top bar + slide-out drawer takes over instead. Unchanged above md,
// where this entire component renders nothing (md:hidden).
export default function MobileNav({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on navigation, so tapping a link doesn't leave it open
  // behind the new page. Adjusting state directly in the render body against
  // a tracked previous value, rather than in an effect, per React's guidance
  // for resetting state when a value changes.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
      <Link href="/dashboard" className="flex items-center">
        <Image src="/logo-full.png" alt="SyncPM" width={96} height={96} unoptimized />
      </Link>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-[6px] text-text-secondary hover:bg-page"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex h-full w-72 max-w-[80vw] flex-col border-r border-border bg-card px-4 py-6 shadow-card">
            <div className="mb-6 flex items-center justify-between px-2">
              <Image src="/logo-full.png" alt="SyncPM" width={112} height={112} unoptimized />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-text-secondary hover:bg-page"
              >
                <X size={18} />
              </button>
            </div>

            <SidebarNav />

            <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
              <p className="truncate px-2 text-[12px] text-text-secondary">
                {userEmail}
              </p>
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
