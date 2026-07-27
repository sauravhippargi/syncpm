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

  // Any saved field is merged back into this component's state so the row
  // reflects the edit — and, when the patch includes status, so the row
  // moves between the Open/Done sections below without a page refresh.
  function handleSaved(id: string, patch: Partial<ActionItemRowData>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const openItems = items.filter((item) => item.status !== "done");
  const doneItems = items.filter((item) => item.status === "done");

  return (
    <div className="flex flex-col gap-4">
      {/* Each item is its own card, not a shared box with dividers (design.md's
          Component Tokens spec) — 16px gap between cards here specifically,
          since these carry more controls than a simple list row. */}
      {openItems.length > 0 && (
        <ul className="flex flex-col gap-4">
          {openItems.map((item) => (
            <ActionItemRow
              key={item.id}
              item={item}
              jiraConnection={jiraConnection}
              onSaved={(patch) => handleSaved(item.id, patch)}
              onDeleted={() => handleDeleted(item.id)}
            />
          ))}
        </ul>
      )}

      {/* Only rendered once at least one item is actually Done — no empty
          "Completed (0)" section (prd.md 6.3a). The toggle stays its own
          compact card; expanded items sit below as siblings, not nested
          inside it — nesting individually-carded rows inside another
          bordered box would read as a card within a card. */}
      {doneItems.length > 0 && (
        <div className="flex flex-col gap-4">
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
          </div>

          {doneExpanded && (
            <ul className="flex flex-col gap-4">
              {doneItems.map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  jiraConnection={jiraConnection}
                  onSaved={(patch) => handleSaved(item.id, patch)}
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
