import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts already redirects unauthenticated requests here, but data access
  // and layout composition must never rely on that alone (rules.md section 3).
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const userEmail = session.user.email ?? "";

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <MobileNav userEmail={userEmail} />
      <Sidebar userEmail={userEmail} />
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
