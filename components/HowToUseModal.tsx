"use client";

import { useEffect } from "react";

const STEPS = [
  {
    title: "Add a meeting",
    description:
      "Upload a transcript manually, or connect Fathom once to have every new meeting import and extract itself automatically.",
  },
  {
    title: "Review & approve",
    description:
      "Check the extracted action items, edit anything that needs fixing, add missing ones, and click Save all (or Save selected) when ready.",
  },
  {
    title: "Track & act",
    description:
      "Approved items show up in Action Items, where you can raise a real ticket, draft a follow-up message, or mark something done.",
  },
  {
    title: "Stay on top of things",
    description:
      "Dashboard and Deadlines always show what's open and coming due; Transcript History and Tickets keep a full record of what's been captured and synced.",
  },
];

// A short, static reference walkthrough of the whole product flow — opened
// from the sidebar's "How to use" item, which isn't a route (prd.md
// sidebar spec). Nothing here fetches or persists anything.
export default function HowToUseModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-[10px] border border-border bg-card p-6 shadow-card">
        <h2 className="text-[14px] font-medium leading-[1.4] text-text-primary">
          How to Use SyncPM
        </h2>

        <div className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[12px] font-medium text-accent">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-medium text-text-primary">
                  {step.title}
                </p>
                <p className="text-[13px] leading-[1.4] text-text-secondary">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
