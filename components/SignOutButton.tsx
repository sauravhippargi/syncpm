import { signOut } from "@/lib/auth";

export default function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="h-8 w-full rounded-[6px] border border-border px-3 text-[12px] font-medium text-text-secondary"
      >
        Sign out
      </button>
    </form>
  );
}
