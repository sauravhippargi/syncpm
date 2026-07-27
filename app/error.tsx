"use client";

import { useEffect } from "react";

// Root-level error boundary — covers failures outside app/(app) (the
// landing/auth page). Must be a Client Component per Next.js's requirement
// for error boundaries.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-page px-6 py-16 text-center">
      <h1 className="text-[20px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary">
        Something Went Wrong
      </h1>
      <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
        An unexpected error occurred loading this page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-1 h-8 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
      >
        Try again
      </button>
    </main>
  );
}
