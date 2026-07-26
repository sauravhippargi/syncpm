"use server";

import { signOut } from "@/lib/auth";

// Module-level "use server" directive (not a function-level one) — required
// so this action can be referenced from a Client Component (MobileNav) as
// well as a Server Component (Sidebar); Next.js only allows that when the
// action lives in its own "use server" file, not inline in a shared
// component's JSX.
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
