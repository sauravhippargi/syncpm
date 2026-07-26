import { signOutAction } from "@/lib/actions";

export default function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="h-8 w-full rounded-[6px] border border-border px-3 text-[12px] font-medium text-text-secondary"
      >
        Sign out
      </button>
    </form>
  );
}
