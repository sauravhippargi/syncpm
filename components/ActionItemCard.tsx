"use client";

import { useState } from "react";
import JiraSyncButton, { type JiraSyncState } from "./JiraSyncButton";

export interface ActionItem {
  id: string;
  description: string;
  owner: string | null;
  dueDate: string | null; // ISO date (YYYY-MM-DD) or null
  status: string;
  isBlocker: boolean;
  blockerNote: string | null;
  isApproved: boolean;
  jiraSync: JiraSyncState | null;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function ActionItemCard({
  item,
  onDeleted,
}: {
  item: ActionItem;
  onDeleted: () => void;
}) {
  const [description, setDescription] = useState(item.description);
  const [owner, setOwner] = useState(item.owner ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(item.dueDate));
  const [isBlocker, setIsBlocker] = useState(item.isBlocker);
  const [blockerNote, setBlockerNote] = useState(item.blockerNote ?? "");
  const [status, setStatus] = useState(item.status);
  const [isApproved, setIsApproved] = useState(item.isApproved);

  const [baseline, setBaseline] = useState(item);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    description !== baseline.description ||
    owner !== (baseline.owner ?? "") ||
    dueDate !== toDateInputValue(baseline.dueDate) ||
    isBlocker !== baseline.isBlocker ||
    blockerNote !== (baseline.blockerNote ?? "") ||
    status !== baseline.status ||
    isApproved !== baseline.isApproved;

  function markDirty() {
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      description,
      owner: owner.trim() || null,
      dueDate: dueDate || null,
      isBlocker,
      blockerNote: isBlocker ? blockerNote.trim() || null : null,
      status,
      isApproved,
    };

    try {
      const res = await fetch(`/api/action-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      setBaseline({ ...baseline, ...payload });
      setSaved(true);
    } catch {
      setError("Failed to save — check your connection");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/action-items/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete");
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Failed to delete — check your connection");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-card px-4 py-3.5">
      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          markDirty();
        }}
        rows={2}
        placeholder="Action item description"
        className="resize-none text-[14px] font-medium leading-[1.4] text-text-primary outline-none"
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] leading-[1.3] text-text-secondary">Owner</label>
          <input
            value={owner}
            onChange={(e) => {
              setOwner(e.target.value);
              markDirty();
            }}
            placeholder="Unassigned"
            className="h-7 w-40 rounded-[6px] border border-border bg-accent-tint px-2 text-[12px] font-medium text-accent outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] leading-[1.3] text-text-secondary">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              markDirty();
            }}
            className="h-7 rounded-[6px] border border-border bg-card px-2 text-[12px] text-text-primary outline-none focus:border-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] leading-[1.3] text-text-secondary">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              markDirty();
            }}
            className="h-7 rounded-[6px] border border-border bg-card px-2 text-[12px] text-text-primary outline-none focus:border-accent"
          >
            <option value="open">Open</option>
            <option value="done">Done</option>
          </select>
        </div>

        <label className="flex items-center gap-1.5 text-[12px] font-medium text-warning">
          <input
            type="checkbox"
            checked={isBlocker}
            onChange={(e) => {
              setIsBlocker(e.target.checked);
              markDirty();
            }}
          />
          Blocker
        </label>

        <label className="flex items-center gap-1.5 text-[12px] font-medium text-accent">
          <input
            type="checkbox"
            checked={isApproved}
            onChange={(e) => {
              setIsApproved(e.target.checked);
              markDirty();
            }}
          />
          Approved
        </label>
      </div>

      {isBlocker && (
        <input
          value={blockerNote}
          onChange={(e) => {
            setBlockerNote(e.target.value);
            markDirty();
          }}
          placeholder="What's blocking this?"
          className="h-7 rounded-[6px] border border-warning-tint bg-warning-tint px-2 text-[12px] text-warning outline-none"
        />
      )}

      {error && <p className="text-[12px] font-medium text-danger">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="h-8 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="h-8 rounded-[6px] border border-danger-tint px-3 text-[12px] font-medium text-danger disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      <JiraSyncButton
        actionItemId={item.id}
        approved={baseline.isApproved}
        initialSync={item.jiraSync}
      />
    </div>
  );
}
