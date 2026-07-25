"use client";

import { useState } from "react";

export default function TranscriptTitle({
  transcriptId,
  initialTitle,
}: {
  transcriptId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = title !== savedTitle;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save title");
        return;
      }
      setSavedTitle(title);
    } catch {
      setError("Failed to save title — check your connection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled meeting"
          aria-label="Meeting title"
          className="-mx-1 min-w-0 flex-1 rounded-[6px] border border-transparent px-1 text-[24px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary outline-none focus:border-border"
        />
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-7 shrink-0 rounded-[6px] bg-accent px-2.5 text-[12px] font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      {error && (
        <p className="text-[12px] font-medium text-danger">{error}</p>
      )}
    </div>
  );
}
