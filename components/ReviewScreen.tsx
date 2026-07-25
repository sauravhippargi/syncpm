"use client";

import { useState } from "react";
import ActionItemCard, { type ActionItem } from "./ActionItemCard";

export default function ReviewScreen({
  transcriptId,
  uploadedAt,
  initialItems,
}: {
  transcriptId: string;
  uploadedAt: string;
  initialItems: ActionItem[];
}) {
  const [items, setItems] = useState<ActionItem[]>(initialItems);
  // Checked by default (prd.md 6.3) — extraction is usually right, so
  // unchecking specific items is less friction than approving each one.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialItems.map((item) => item.id))
  );
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleAddItem() {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add item");
        return;
      }
      const newItem = data.item as ActionItem;
      setItems((prev) => [...prev, newItem]);
      setSelectedIds((prev) => new Set(prev).add(newItem.id));
    } catch {
      setAddError("Failed to add item — check your connection");
    } finally {
      setAdding(false);
    }
  }

  function handleFieldChange(id: string, patch: Partial<ActionItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    setSaveMessage(null);
  }

  function handleToggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaveMessage(null);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // Marks the checked items approved and persists any edits. Unchecked items
  // are left exactly as they are — never deleted or otherwise touched here
  // (prd.md 6.3).
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const checkedItems = items.filter((item) => selectedIds.has(item.id));

    try {
      const responses = await Promise.all(
        checkedItems.map((item) =>
          fetch(`/api/action-items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: item.description,
              owner: item.owner?.trim() || null,
              dueDate: item.dueDate || null,
              blockerNote: item.blockerNote?.trim() || null,
              status: item.status,
              isApproved: true,
            }),
          })
        )
      );

      if (responses.some((res) => !res.ok)) {
        setSaveError("Failed to save one or more items — try again");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          selectedIds.has(item.id) ? { ...item, isApproved: true } : item
        )
      );
      setSaveMessage(
        checkedItems.length === items.length
          ? "Saved all items"
          : `Saved ${checkedItems.length} item${checkedItems.length === 1 ? "" : "s"}`
      );
    } catch {
      setSaveError("Failed to save — check your connection");
    } finally {
      setSaving(false);
    }
  }

  const allChecked = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Uploaded {uploadedAt} — review, edit, or add action items below.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || selectedIds.size === 0}
          className="h-8 shrink-0 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : allChecked ? "Save all" : "Save selected"}
        </button>
      </div>

      {saveError && <p className="text-[12px] font-medium text-danger">{saveError}</p>}
      {saveMessage && <p className="text-[12px] font-medium text-success">{saveMessage}</p>}

      {items.length === 0 && (
        <p className="text-[14px] leading-[1.5] text-text-secondary">
          No action items yet. Add one manually below.
        </p>
      )}

      {items.map((item) => (
        <ActionItemCard
          key={item.id}
          item={item}
          selected={selectedIds.has(item.id)}
          onToggleSelected={() => handleToggleSelected(item.id)}
          onChange={(patch) => handleFieldChange(item.id, patch)}
          onDeleted={() => handleDelete(item.id)}
        />
      ))}

      {addError && <p className="text-[12px] font-medium text-danger">{addError}</p>}

      <button
        type="button"
        onClick={handleAddItem}
        disabled={adding}
        className="h-8 self-start rounded-[6px] border border-border px-3 text-[12px] font-medium text-text-primary disabled:opacity-50"
      >
        {adding ? "Adding…" : "+ Add item"}
      </button>
    </div>
  );
}
