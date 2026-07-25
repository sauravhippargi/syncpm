"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Action Items tab only (prd.md 6.3a) — the only place status is
// visible/editable after an item leaves Review & Edit's ActionItemCard.
// Saves immediately on change (no page-level "Save all" here, unlike
// Review & Edit), and refreshes so the Dashboard's "Completed action
// items" count stays in sync the next time it's loaded.
export default function ActionItemStatusSelect({
  actionItemId,
  status,
}: {
  actionItemId: string;
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string) {
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/action-items/${actionItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setValue(previous);
        return;
      }
      router.refresh();
    } catch {
      setValue(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Status"
      className="h-7 rounded-[6px] border border-border bg-card px-2 text-[12px] text-text-primary outline-none focus:border-accent disabled:opacity-50"
    >
      <option value="open">Open</option>
      <option value="done">Done</option>
    </select>
  );
}
