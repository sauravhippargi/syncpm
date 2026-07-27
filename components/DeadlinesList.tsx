"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DeadlineDueDateInput from "./DeadlineDueDateInput";
import { isBlockerNote } from "@/lib/action-items";
import { groupDeadlines, type DeadlineGroup, type DeadlineItemData } from "@/lib/deadlines";

// Deadlines page only (prd.md 6.8) — holds items in state (like
// ActionItemsList does for Open/Done) so an inline due-date edit regroups
// instantly: a new date group if none exists yet, or across the
// Missed/Upcoming boundary if the new date crosses today. No page refresh.
export default function DeadlinesList({
  initialItems,
  todayUTC,
}: {
  initialItems: DeadlineItemData[];
  todayUTC: string;
}) {
  const [items, setItems] = useState(initialItems);

  function handleDueDateChange(id: string, dueDate: string | null) {
    setItems((prev) =>
      dueDate === null
        ? prev.filter((item) => item.id !== id)
        : prev.map((item) => (item.id === id ? { ...item, dueDate } : item))
    );
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
          onDueDateChange={handleDueDateChange}
        />
      )}
      {upcoming.length > 0 && (
        <DeadlineSection
          title="Upcoming Deadlines"
          variant="upcoming"
          groups={upcoming}
          onDueDateChange={handleDueDateChange}
        />
      )}
    </div>
  );
}

function DeadlineSection({
  title,
  variant,
  groups,
  onDueDateChange,
}: {
  title: string;
  variant: "missed" | "upcoming";
  groups: DeadlineGroup[];
  onDueDateChange: (id: string, dueDate: string | null) => void;
}) {
  const missed = variant === "missed";
  return (
    <section className="flex flex-col gap-3">
      <h2
        className={`text-[14px] font-semibold ${
          missed ? "text-danger" : "text-text-primary"
        }`}
      >
        {title}
      </h2>
      <div className="rounded-[10px] border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              <p
                className={`text-[12.5px] font-medium ${
                  missed ? "text-danger" : "text-text-secondary"
                }`}
              >
                {group.label}
              </p>
              <ul className="flex flex-col divide-y divide-row-divider">
                {group.items.map((item) => (
                  <DeadlineRow
                    key={item.id}
                    item={item}
                    onDueDateChange={onDueDateChange}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// The due date is no longer shown as plain text per-row — it's established
// once by the group's date header, and now editable via a compact date
// input (prd.md 6.8). Everything else on the row stays: owner pill, blocker
// tag, and the source-transcript link.
function DeadlineRow({
  item,
  onDueDateChange,
}: {
  item: DeadlineItemData;
  onDueDateChange: (id: string, dueDate: string | null) => void;
}) {
  return (
    <li className="flex flex-col py-3 first:pt-0 last:pb-0">
      <span className="mb-1.5 text-[14.5px] font-normal text-text-primary">
        {item.description || "Untitled action item"}
      </span>

      <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-text-secondary">
        <span className="rounded-[6px] bg-accent-tint px-2 py-1 font-medium text-accent">
          {item.owner || "Unassigned"}
        </span>
        {isBlockerNote(item.blockerNote) && (
          <span className="rounded-[6px] bg-warning-tint px-2 py-1 font-medium text-warning-text">
            Blocker
          </span>
        )}
        <DeadlineDueDateInput
          actionItemId={item.id}
          dueDate={item.dueDate}
          onDueDateChange={(dueDate) => onDueDateChange(item.id, dueDate)}
        />
        <Link
          href={`/review/${item.transcriptId}`}
          className="ml-auto text-text-secondary hover:underline"
        >
          {item.transcriptTitle || "Untitled meeting"}
        </Link>
      </div>
    </li>
  );
}
