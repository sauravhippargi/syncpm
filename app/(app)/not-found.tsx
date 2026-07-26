import Link from "next/link";

// Covers any notFound() call from a page inside app/(app) — including
// Review & Edit's lookup for a bad/foreign transcript ID — with the sidebar
// still mounted around it, instead of falling through to Next's generic
// default 404.
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-[20px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary">
        Page not found
      </h1>
      <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
        This page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="mt-1 flex h-8 items-center rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
