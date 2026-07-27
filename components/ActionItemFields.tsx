"use client";

import { useRef, useState } from "react";

export interface ActionItemFieldsValue {
  owner: string | null;
  dueDate: string | null; // ISO date (YYYY-MM-DD) or full ISO datetime, or null
  status: string; // "open" | "done"
  blockerNote: string | null;
}

export type ActionItemFieldsPatch = Partial<ActionItemFieldsValue>;

export type ActionItemFieldsSaveResult = { ok: true } | { ok: false; error?: string };

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

async function defaultPersist(
  actionItemId: string,
  patch: ActionItemFieldsPatch
): Promise<ActionItemFieldsSaveResult> {
  try {
    const res = await fetch(`/api/action-items/${actionItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: undefined };
  }
}

// The one editable-fields implementation shared by ActionItemCard (Review &
// Edit), ActionItemRow (Action Items tab), and the Deadlines page's item
// card — owner, due date, status, and blockers can't drift in look or
// capability between the three anymore, since they all render this same
// component (architecture.md components list; prd.md 6.3/6.3a/6.8).
//
// Each field saves on its own "commit" moment (date/status: immediately on
// change, since picking one is already a discrete, deliberate action; owner/
// blockers: on blur, so free typing doesn't fire a network request per
// keystroke) — reverting to the previous value and showing a real error
// message if that save fails, same pattern already used by the
// per-field components this replaces.
//
// Persistence itself is pluggable via `persist` (defaults to a real PATCH to
// /api/action-items/:id, used by Action Items and Deadlines). Review & Edit
// passes a local-only override that never touches the network — that page's
// real persistence is deferred to its own page-level Save button (prd.md
// 6.3) — so a field still updates instantly and reports up via `onSaved`,
// just without a premature server write.
export default function ActionItemFields({
  actionItemId,
  value,
  onSaved,
  persist,
}: {
  actionItemId: string;
  value: ActionItemFieldsValue;
  onSaved: (patch: ActionItemFieldsPatch) => void;
  persist?: (
    patch: ActionItemFieldsPatch
  ) => ActionItemFieldsSaveResult | Promise<ActionItemFieldsSaveResult>;
}) {
  const save = persist ?? ((patch: ActionItemFieldsPatch) => defaultPersist(actionItemId, patch));

  // Text fields (owner, blockers) are controlled — onChange updates the
  // input state on every keystroke — and only *commit* (save) on blur. The
  // guard against a no-op save must therefore compare the blurred value
  // against the last *committed* value, not against live state (which
  // onChange has already moved to the new value), or the guard would always
  // short-circuit and nothing would ever save. Refs hold that committed
  // baseline; date/status commit immediately on change and don't need one.
  const [owner, setOwner] = useState(value.owner ?? "");
  const committedOwner = useRef(value.owner ?? "");
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  const [dueDate, setDueDate] = useState(toDateInputValue(value.dueDate));
  const [dueDateSaving, setDueDateSaving] = useState(false);
  const [dueDateError, setDueDateError] = useState<string | null>(null);

  const [status, setStatus] = useState(value.status);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [blockerNote, setBlockerNote] = useState(value.blockerNote ?? "");
  const committedBlockerNote = useRef(value.blockerNote ?? "");
  const [blockerSaving, setBlockerSaving] = useState(false);
  const [blockerError, setBlockerError] = useState<string | null>(null);

  async function commitOwner(next: string) {
    const previous = committedOwner.current;
    if (next === previous) return; // Unchanged since the last commit — a blur without an edit shouldn't fire a save.
    setOwnerSaving(true);
    setOwnerError(null);
    const patch = { owner: next.trim() || null };
    const result = await save(patch);
    if (!result.ok) {
      setOwnerError(result.error || "Failed to update owner");
      setOwner(previous); // revert the input to the last committed value
    } else {
      committedOwner.current = next;
      onSaved(patch);
    }
    setOwnerSaving(false);
  }

  async function commitDueDate(next: string) {
    const previous = dueDate;
    setDueDate(next);
    setDueDateSaving(true);
    setDueDateError(null);
    const patch = { dueDate: next || null };
    const result = await save(patch);
    if (!result.ok) {
      setDueDateError(result.error || "Failed to update due date");
      setDueDate(previous);
    } else {
      onSaved(patch);
    }
    setDueDateSaving(false);
  }

  async function commitStatus(next: string) {
    const previous = status;
    setStatus(next);
    setStatusSaving(true);
    setStatusError(null);
    const patch = { status: next };
    const result = await save(patch);
    if (!result.ok) {
      setStatusError(result.error || "Failed to update status");
      setStatus(previous);
    } else {
      onSaved(patch);
    }
    setStatusSaving(false);
  }

  async function commitBlockerNote(next: string) {
    const previous = committedBlockerNote.current;
    if (next === previous) return;
    setBlockerSaving(true);
    setBlockerError(null);
    const patch = { blockerNote: next.trim() || null };
    const result = await save(patch);
    if (!result.ok) {
      setBlockerError(result.error || "Failed to update blockers");
      setBlockerNote(previous); // revert the input to the last committed value
    } else {
      committedBlockerNote.current = next;
      onSaved(patch);
    }
    setBlockerSaving(false);
  }

  const anyError = ownerError || dueDateError || statusError || blockerError;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          onBlur={(e) => commitOwner(e.target.value)}
          disabled={ownerSaving}
          placeholder="Unassigned"
          aria-label="Owner"
          className="h-7 w-28 rounded-[6px] border border-border bg-accent-tint px-2 text-[12px] font-medium text-accent outline-none focus:border-accent disabled:opacity-50"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => commitDueDate(e.target.value)}
          disabled={dueDateSaving}
          aria-label="Due date"
          className="h-7 rounded-[6px] border border-border bg-card px-2 text-[12px] text-text-primary outline-none focus:border-accent disabled:opacity-50"
        />
        <select
          value={status}
          onChange={(e) => commitStatus(e.target.value)}
          disabled={statusSaving}
          aria-label="Status"
          className="h-7 rounded-[6px] border border-border bg-card px-2 text-[12px] text-text-primary outline-none focus:border-accent disabled:opacity-50"
        >
          <option value="open">Open</option>
          <option value="done">Done</option>
        </select>
        <input
          value={blockerNote}
          onChange={(e) => setBlockerNote(e.target.value)}
          onBlur={(e) => commitBlockerNote(e.target.value)}
          disabled={blockerSaving}
          placeholder="Blockers (optional)"
          aria-label="Blockers"
          className="h-7 w-44 rounded-[6px] border border-warning-tint bg-card px-2 text-[12px] text-text-primary outline-none focus:border-warning disabled:opacity-50"
        />
      </div>
      {anyError && (
        <div className="flex flex-col gap-0.5">
          {ownerError && <p className="text-[11px] font-medium text-danger">{ownerError}</p>}
          {dueDateError && <p className="text-[11px] font-medium text-danger">{dueDateError}</p>}
          {statusError && <p className="text-[11px] font-medium text-danger">{statusError}</p>}
          {blockerError && <p className="text-[11px] font-medium text-danger">{blockerError}</p>}
        </div>
      )}
    </div>
  );
}
