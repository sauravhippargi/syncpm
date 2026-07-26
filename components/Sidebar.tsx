import Image from "next/image";
import Link from "next/link";
import SidebarNav from "./SidebarNav";
import SignOutButton from "./SignOutButton";

// Persistent desktop nav — hidden below md, where MobileNav's slide-out
// drawer takes over instead. Unchanged above md.
export default function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-6 flex items-center justify-center px-2">
        <Image src="/logo-full.png" alt="SyncPM" width={128} height={128} />
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
