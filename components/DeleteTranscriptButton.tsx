"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteTranscriptButton({
  transcriptId,
  title,
  actionItemCount,
}: {
  transcriptId: string;
  title: string;
  actionItemCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete transcript");
        setDeleting(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to delete transcript — check your connection");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Delete ${title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-text-secondary transition-colors hover:bg-danger-tint hover:text-danger"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M2 4h12M6.5 4V2.75A.75.75 0 0 1 7.25 2h1.5a.75.75 0 0 1 .75.75V4m-6 0 .577 8.657A1 1 0 0 0 4.324 14h7.352a1 1 0 0 0 .997-.943L13.25 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setOpen(false);
          }}
        >
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-[10px] border border-border bg-card p-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[14px] font-medium leading-[1.4] text-text-primary">
                Delete this transcript?
              </h2>
              <p className="text-[13px] leading-[1.4] text-text-secondary">
                {`This removes "${title}" and its ${actionItemCount} action item${actionItemCount === 1 ? "" : "s"} from SyncPM. This can't be undone. Tickets already created in Jira will not be affected.`}
              </p>
            </div>

            {error && (
              <p className="text-[12px] font-medium text-danger">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={deleting}
                className="h-8 rounded-[6px] bg-danger px-3 text-[12px] font-medium text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete transcript"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
