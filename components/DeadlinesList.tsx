"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ActionItemFields, { type ActionItemFieldsPatch } from "./ActionItemFields";
import { groupDeadlines, type DeadlineGroup, type DeadlineItemData } from "@/lib/deadlines";

// Deadlines page only (prd.md 6.8) — holds items in state (like
// ActionItemsList does for Open/Done) so an inline field edit updates
// instantly with no page refresh: a due-date change regroups (a new date
// group if none exists yet, or across the Missed/Upcoming boundary if the
// new date crosses today), and marking Status → Done drops the item out of
// this view, since Deadlines only ever lists open items — the direct
// analogue of Action Items moving it into its Done section.
export default function DeadlinesList({
  initialItems,
  todayUTC,
}: {
  initialItems: DeadlineItemData[];
  todayUTC: string;
}) {
  const [items, setItems] = useState(initialItems);

  function handleSaved(id: string, patch: ActionItemFieldsPatch) {
    setItems((prev) => {
      // This page only lists open items with a due date — so a Done status
      // or a cleared due date means the item no longer belongs here at all.
      if (patch.status === "done" || patch.dueDate === null) {
        return prev.filter((item) => item.id !== id);
      }
      // patch.dueDate is now known non-null (removed above), so merging it
      // keeps DeadlineItemData's required string dueDate intact.
      const { dueDate, ...rest } = patch;
      const merged = dueDate != null ? { ...rest, dueDate } : rest;
      return prev.map((item) => (item.id === id ? { ...item, ...merged } : item));
    });
  }

  const { missed, upcoming } = useMemo(
    () => groupDeadlines(items, todayUTC),
    [items, todayUTC]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Missed only renders when something actually qualifies — no empty
          header (prd.md 6.8). Upcoming is guarded the same way for the
          all-missed edge case; since items exist, at least one section
          always renders. */}
      {missed.length > 0 && (
        <DeadlineSection
          title="Missed Deadlines"
          variant="missed"
          groups={missed}
          onSaved={handleSaved}
        />
      )}
      {upcoming.length > 0 && (
        <DeadlineSection
          title="Upcoming Deadlines"
          variant="upcoming"
          groups={upcoming}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function DeadlineSection({
  title,
  variant,
  groups,
  onSaved,
}: {
  title: string;
  variant: "missed" | "upcoming";
  groups: DeadlineGroup[];
  onSaved: (id: string, patch: ActionItemFieldsPatch) => void;
}) {
  const missed = variant === "missed";
  return (
    <section className="flex flex-col gap-4">
      <h2
        className={`text-[14px] font-semibold ${
          missed ? "text-danger" : "text-text-primary"
        }`}
      >
        {title}
      </h2>
      {/* No shared card here — a date-group header is a plain-text label
          sitting outside/above the cards below it, not padded inside the
          same box as the items (design.md's Deadlines layout spec). */}
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-3">
            <p
              className={`text-[12.5px] font-medium ${
                missed ? "text-danger" : "text-text-secondary"
              }`}
            >
              {group.label}
            </p>
            <ul className="flex flex-col gap-3">
              {group.items.map((item) => (
                <DeadlineRow key={item.id} item={item} onSaved={onSaved} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// Each action item is its own separate card — same bordered/shadowed style
// as Action Items and Recent Transcripts (design.md's Deadlines layout
// spec). Owner, due date, status, and blockers are edited inline through the
// shared ActionItemFields component — the same one Review & Edit and Action
// Items use — which is what gives Deadlines a Status control it previously
// lacked (prd.md 6.8). The date is still established for scanning by the
// group's date header above; the source-transcript link stays. Ticket/
// message actions and the bulk-approve checkbox are intentionally NOT here —
// those stay scoped to Action Items and Review & Edit respectively.
function DeadlineRow({
  item,
  onSaved,
}: {
  item: DeadlineItemData;
  onSaved: (id: string, patch: ActionItemFieldsPatch) => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-[10px] border border-border bg-card px-4 py-3.5 shadow-card">
      <div className="flex flex-col">
        <span className="mb-1.5 text-[14.5px] font-normal text-text-primary">
          {item.description || "Untitled action item"}
        </span>
        <Link
          href={`/review/${item.transcriptId}`}
          className="text-[12.5px] text-text-secondary hover:underline"
        >
          {item.transcriptTitle || "Untitled meeting"}
        </Link>
      </div>

      <ActionItemFields
        actionItemId={item.id}
        value={{
          owner: item.owner,
          dueDate: item.dueDate,
          status: item.status,
          blockerNote: item.blockerNote,
        }}
        ownerEvidence={item.ownerEvidence}
        onSaved={(patch) => onSaved(item.id, patch)}
      />
    </li>
  );
}
