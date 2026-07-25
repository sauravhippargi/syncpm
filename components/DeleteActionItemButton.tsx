"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

// Shared by ActionItemCard (Review & Edit) and ActionItemRow (Action Items
// tab) — permanently removes an item, distinct from unchecking it on
// Review & Edit which just defers approval (prd.md 6.3).
export default function DeleteActionItemButton({
  actionItemId,
  description,
  onDeleted,
}: {
  actionItemId: string;
  description: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/action-items/${actionItemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete");
        setDeleting(false);
        return;
      }
      setOpen(false);
      onDeleted();
    } catch {
      setError("Failed to delete — check your connection");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete action item"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-text-secondary transition-colors hover:bg-danger-tint hover:text-danger"
      >
        <Trash2 size={16} />
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
                Delete this action item?
              </h2>
              <p className="text-[13px] leading-[1.4] text-text-secondary">
                {`This permanently removes "${description || "this item"}". This can't be undone.`}
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
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
