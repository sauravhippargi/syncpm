"use client";

import { useState } from "react";
import Link from "next/link";
import ExtractionLoader from "./ExtractionLoader";
import type { SlackDraftResult } from "@/app/api/slack/draft/route";

const SLACK_DRAFT_MESSAGES = [
  "Reviewing approved items…",
  "Grouping by owner…",
  "Drafting messages…",
  "Almost done…",
];

// Lives on Review & Edit, below the action item cards — shown only once at
// least one item on the transcript is approved (prd.md 6.5). Drafts are
// generated on demand and held only in this component's state, never
// persisted — reopening the screen starts from a blank slate again.
export default function SlackDraftCard({ transcriptId }: { transcriptId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<SlackDraftResult[] | null>(null);

  async function handleDraft() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/slack/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to draft Slack messages");
        return;
      }
      setDrafts(data.drafts);
    } catch {
      setError("Failed to draft Slack messages — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-text-primary">
          Slack follow-ups
        </p>
        <button
          type="button"
          onClick={handleDraft}
          disabled={loading}
          className="h-8 shrink-0 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white disabled:opacity-50"
        >
          {loading ? "Drafting…" : drafts ? "Redraft messages" : "Draft messages"}
        </button>
      </div>

      {loading && <ExtractionLoader messages={SLACK_DRAFT_MESSAGES} />}

      {error && <p className="text-[12px] font-medium text-danger">{error}</p>}

      {!loading && drafts && (
        <div className="flex flex-col gap-3">
          {drafts.map((draft) =>
            draft.owner ? (
              <OwnerDraftCard key={draft.owner} owner={draft.owner} message={draft.message ?? ""} />
            ) : (
              <UnassignedDraftCard
                key="unassigned"
                transcriptId={transcriptId}
                items={draft.items}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function OwnerDraftCard({ owner, message }: { owner: string; message: string }) {
  const [text, setText] = useState(message);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, non-secure context) — the text
      // stays visible in the textarea for manual copy either way.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-page p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-medium text-text-primary">{owner}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="h-7 shrink-0 rounded-[6px] border border-border bg-card px-2.5 text-[12px] font-medium text-text-primary"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="resize-y rounded-[6px] border border-border bg-card p-2.5 text-[13px] leading-[1.5] text-text-primary outline-none focus:border-accent"
      />
    </div>
  );
}

function UnassignedDraftCard({
  transcriptId,
  items,
}: {
  transcriptId: string;
  items: { id: string; description: string }[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-border bg-page p-4">
      <p className="flex items-center gap-1.5 text-[14px] font-medium text-text-primary">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
        Unassigned
      </p>
      <p className="text-[12px] leading-[1.4] text-text-secondary">
        Assign an owner to these items before a message can be drafted for them:
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 text-[13px] text-text-primary"
          >
            <span className="truncate">{item.description || "Untitled action item"}</span>
            <Link
              href={`/review/${transcriptId}?focusItem=${item.id}`}
              className="shrink-0 text-[12px] font-medium text-accent hover:underline"
            >
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
