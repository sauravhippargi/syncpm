"use client";

import { useState } from "react";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// Action Items tab only (prd.md 6.3a) — a real date input, always visible,
// matching the Status dropdown's saves-on-change pattern rather than
// requiring a click through to Review & Edit for a small date change. On
// failure, reverts the input and shows a real error message (not a silent
// revert) — same pattern as ActionItemStatusSelect.
export default function ActionItemDueDateInput({
  actionItemId,
  dueDate,
  onDueDateChange,
}: {
  actionItemId: string;
  dueDate: string | null;
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
        className="h-7 rounded-[6px] border border-border bg-card px-2 text-[12px] text-text-primary outline-none focus:border-accent disabled:opacity-50"
      />
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
}
