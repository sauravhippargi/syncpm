"use client";

import { useState } from "react";
import ActionItemCard, { type ActionItem } from "./ActionItemCard";

export default function ReviewScreen({
  transcriptId,
  initialItems,
}: {
  transcriptId: string;
  initialItems: ActionItem[];
}) {
  const [items, setItems] = useState<ActionItem[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
      setItems((prev) => [...prev, data.item as ActionItem]);
    } catch {
      setAddError("Failed to add item — check your connection");
    } finally {
      setAdding(false);
    }
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <p className="text-[14px] leading-[1.5] text-text-secondary">
          No action items yet. Add one manually below.
        </p>
      )}

      {items.map((item) => (
        <ActionItemCard key={item.id} item={item} onDeleted={() => handleDelete(item.id)} />
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
