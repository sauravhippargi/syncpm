import Link from "next/link";
import SidebarNav from "./SidebarNav";
import SignOutButton from "./SignOutButton";

export default function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-6">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-accent text-[12px] font-semibold text-white">
          S
        </span>
        <span className="text-[14px] font-semibold text-text-primary">
          SyncPM
        </span>
      </Link>

      <SidebarNav />

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <p className="truncate px-2 text-[12px] text-text-secondary">
          {userEmail}
        </p>
        <SignOutButton />
      </div>
    </aside>
  );
}
