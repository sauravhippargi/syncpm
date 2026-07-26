"use client";

import { useState } from "react";

// Lives in ActionItemRow (Action Items tab), per-item like JiraSyncButton —
// greyed out with no owner; one editable AI-drafted message + Copy
// (prd.md 6.5). Nothing is persisted — closing and reopening regenerates
// a fresh draft.
export default function SlackDraftModal({
  actionItemId,
  owner,
}: {
  actionItemId: string;
  owner: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const disabled = !owner?.trim();

  // Fired directly from the click, not a mount effect — a click handler
  // only ever runs once per real click, unlike a useEffect, which React's
  // StrictMode intentionally double-invokes in development. That was
  // silently sending every Gemini draft request twice.
  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/slack/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItemId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to draft the message");
        return;
      }
      setText(data.message);
    } catch {
      setError("Failed to draft the message — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        title={disabled ? "Assign an owner to draft a message for this item" : undefined}
        className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        Draft message
      </button>

      {open && (
        <DraftModalBody
          loading={loading}
          error={error}
          text={text}
          onTextChange={setText}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function DraftModalBody({
  loading,
  error,
  text,
  onTextChange,
  onClose,
}: {
  loading: boolean;
  error: string | null;
  text: string;
  onTextChange: (value: string) => void;
  onClose: () => void;
}) {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-[10px] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-medium leading-[1.4] text-text-primary">
            Draft message
          </h2>
          <p className="text-[13px] leading-[1.4] text-text-secondary">
            An AI-drafted Slack message for this action item — edit before sending.
          </p>
        </div>

        {loading ? (
          <p className="text-[13px] text-text-secondary">Drafting…</p>
        ) : error ? (
          <p className="text-[13px] font-medium text-danger">{error}</p>
        ) : (
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={6}
            className="resize-y rounded-[6px] border border-border bg-page p-2.5 text-[13px] leading-[1.5] text-text-primary outline-none focus:border-accent"
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary"
          >
            Close
          </button>
          {!loading && !error && (
            <button
              type="button"
              onClick={handleCopy}
              className="h-8 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
