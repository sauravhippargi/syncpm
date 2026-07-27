"use client";

import { useState } from "react";

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

// Deadlines page only (prd.md 6.8) — a compact inline date control per row,
// deliberately smaller than the date-group header above it: the header
// already establishes the date for scanning, this control exists
// specifically to change it. Reports the saved value up so DeadlinesList can
// regroup instantly (a new date group, or across the Missed/Upcoming
// boundary) with no page refresh. On failure, reverts the input and shows a
// real error message — same pattern as ActionItemDueDateInput/
// ActionItemStatusSelect.
export default function DeadlineDueDateInput({
  actionItemId,
  dueDate,
  onDueDateChange,
}: {
  actionItemId: string;
  dueDate: string;
  onDueDateChange: (dueDate: string | null) => void;
}) {
  const [value, setValue] = useState(toDateInputValue(dueDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    const previous = value;
    setValue(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/action-items/${actionItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: next || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update due date");
        setValue(previous);
        return;
      }
      // Clearing the date removes this item from the Deadlines view
      // entirely — this page only ever lists items that have one — rather
      // than leaving a row with no date to group under.
      onDueDateChange(next || null);
    } catch {
      setError("Failed to update due date — check your connection");
      setValue(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="date"
        value={value}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Due date"
        className="h-6 rounded-[4px] border border-border bg-card px-1.5 text-[11px] text-text-primary outline-none focus:border-accent disabled:opacity-50"
      />
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
}
