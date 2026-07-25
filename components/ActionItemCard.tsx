"use client";

import DeleteActionItemButton from "./DeleteActionItemButton";

export interface ActionItem {
  id: string;
  description: string;
  owner: string | null;
  dueDate: string | null; // ISO date (YYYY-MM-DD) or full ISO datetime, or null
  status: string;
  blockerNote: string | null;
  isApproved: boolean;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// Review & Edit is purely extraction triage and editing (prd.md 6.3) — field
// state lives in the parent (ReviewScreen) so the page-level Save
// all/selected button can persist every checked item's current edits at
// once, rather than each card managing its own save.
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] leading-[1.3] text-text-secondary">Owner</label>
            <input
              value={item.owner ?? ""}
              onChange={(e) => onChange({ owner: e.target.value })}
              placeholder="Unassigned"
              className="h-7 w-40 rounded-[6px] border border-border bg-accent-tint px-2 text-[12px] font-medium text-accent outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] leading-[1.3] text-text-secondary">Due date</label>
            <input
              type="date"
              value={toDateInputValue(item.dueDate)}
              onChange={(e) => onChange({ dueDate: e.target.value || null })}
              className="h-7 rounded-[6px] border border-border bg-card px-2 text-[12px] text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] leading-[1.3] text-text-secondary">Status</label>
            <select
              value={item.status}
              onChange={(e) => onChange({ status: e.target.value })}
              className="h-7 rounded-[6px] border border-border bg-card px-2 text-[12px] text-text-primary outline-none focus:border-accent"
            >
              <option value="open">Open</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] leading-[1.3] text-text-secondary">
            Blockers (optional)
          </label>
          <input
            value={item.blockerNote ?? ""}
            onChange={(e) => onChange({ blockerNote: e.target.value })}
            placeholder="What's blocking this?"
            className="h-7 rounded-[6px] border border-warning-tint bg-card px-2 text-[12px] text-text-primary outline-none focus:border-warning"
          />
        </div>
      </div>

      <DeleteActionItemButton
        actionItemId={item.id}
        description={item.description}
        onDeleted={onDeleted}
      />
    </div>
  );
}
