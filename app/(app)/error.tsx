"use client";

import { useEffect } from "react";

// Error boundaries must be Client Components (Next.js requirement). The
// layout (sidebar) stays mounted around this — only the content area shows
// the error — since app/(app)/error.tsx catches throws from any page
// inside the group.
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
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-[20px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary">
        Something Went Wrong
      </h1>
      <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
        An unexpected error occurred while loading this page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-1 h-8 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
