import Link from "next/link";

// Root-level 404 — covers any unmatched route that doesn't fall under
// app/(app) (which has its own not-found.tsx for authenticated pages).
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-page px-6 py-16 text-center">
      <h1 className="text-[20px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary">
        Page Not Found
      </h1>
      <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-1 flex h-8 items-center rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
      >
        Back to home
      </Link>
    </main>
  );
}
