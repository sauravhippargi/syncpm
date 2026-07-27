"use client";

import DeleteActionItemButton from "./DeleteActionItemButton";
import ActionItemFields, { type ActionItemFieldsPatch } from "./ActionItemFields";

export interface ActionItem {
  id: string;
  description: string;
  owner: string | null;
  dueDate: string | null; // ISO date (YYYY-MM-DD) or full ISO datetime, or null
  status: string;
  blockerNote: string | null;
  isApproved: boolean;
}

// Review & Edit is purely extraction triage and editing (prd.md 6.3) — field
// state lives in the parent (ReviewScreen) so the page-level Save
// all/selected button can persist every checked item's current edits at
// once, rather than each field saving itself. ActionItemFields' `persist`
// is overridden to a local-only no-op here for exactly that reason — a
// field still updates instantly via `onSaved` (merged into ReviewScreen's
// item state through onChange), it just never hits the network on its own;
// real persistence happens later, in bulk, when Save is clicked.
export default function ActionItemCard({
  item,
  selected,
  onToggleSelected,
  onChange,
  onDeleted,
}: {
  item: ActionItem;
  selected: boolean;
  onToggleSelected: () => void;
  onChange: (patch: Partial<ActionItem>) => void;
  onDeleted: () => void;
}) {
  return (
    <div className="flex gap-3 rounded-[10px] border border-border bg-card px-4 py-3.5 shadow-card">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelected}
        aria-label="Include in save"
        className="mt-1 h-4 w-4 shrink-0 accent-accent"
      />

      <div className="flex flex-1 flex-col gap-3">
        <textarea
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="Action item description"
          className="resize-none text-[14px] font-medium leading-[1.4] text-text-primary outline-none"
        />

        <ActionItemFields
          actionItemId={item.id}
          value={{
            owner: item.owner,
            dueDate: item.dueDate,
            status: item.status,
            blockerNote: item.blockerNote,
          }}
          onSaved={(patch: ActionItemFieldsPatch) => onChange(patch)}
          persist={() => ({ ok: true })}
        />
      </div>

      <DeleteActionItemButton
        actionItemId={item.id}
        description={item.description}
        onDeleted={onDeleted}
      />
    </div>
  );
}
