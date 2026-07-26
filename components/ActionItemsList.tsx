"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import ActionItemRow, { type ActionItemRowData } from "./ActionItemRow";
import type { JiraConnectionSummary } from "./JiraSyncButton";

// Two sections, not one flat list (prd.md 6.3a): Open items always sit
// above a separate, collapsed-by-default Done section — moving a row
// between them happens entirely in this component's own state, so it's
// instant and never needs a server round-trip or page refresh.
export default function ActionItemsList({
  initialItems,
  jiraConnection,
}: {
  initialItems: ActionItemRowData[];
  jiraConnection: JiraConnectionSummary | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [doneExpanded, setDoneExpanded] = useState(false);

  function handleStatusChange(id: string, status: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const openItems = items.filter((item) => item.status !== "done");
  const doneItems = items.filter((item) => item.status === "done");

  return (
    <div className="flex flex-col gap-3">
      {openItems.length > 0 && (
        <div className="rounded-[10px] border border-border bg-card p-4 shadow-card">
          <ul className="flex flex-col divide-y divide-row-divider">
            {openItems.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                jiraConnection={jiraConnection}
                onStatusChange={(status) => handleStatusChange(item.id, status)}
                onDeleted={() => handleDeleted(item.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Only rendered once at least one item is actually Done — no empty
          "Completed (0)" section (prd.md 6.3a). */}
      {doneItems.length > 0 && (
        <div className="rounded-[10px] border border-border bg-card p-4 shadow-card">
          <button
            type="button"
            onClick={() => setDoneExpanded((expanded) => !expanded)}
            aria-expanded={doneExpanded}
            className="flex w-full items-center gap-2 text-left text-[14px] font-semibold text-text-primary"
          >
            <ChevronRight
              size={16}
              className={`shrink-0 text-text-secondary transition-transform ${
                doneExpanded ? "rotate-90" : ""
              }`}
            />
            Completed ({doneItems.length})
          </button>

          {doneExpanded && (
            <ul className="mt-3 flex flex-col divide-y divide-row-divider">
              {doneItems.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  jiraConnection={jiraConnection}
                  onStatusChange={(status) => handleStatusChange(item.id, status)}
                  onDeleted={() => handleDeleted(item.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
