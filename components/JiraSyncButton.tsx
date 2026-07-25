"use client";

import { useState } from "react";

export interface JiraSyncState {
  status: "synced" | "failed";
  jiraIssueKey: string | null;
  jiraUrl: string | null;
}

export default function JiraSyncButton({
  actionItemId,
  approved,
  initialSync,
}: {
  actionItemId: string;
  approved: boolean;
  initialSync: JiraSyncState | null;
}) {
  const [sync, setSync] = useState<JiraSyncState | null>(initialSync);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!approved) return null;

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/jira/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItemId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to sync to Jira");
        setSync({ status: "failed", jiraIssueKey: null, jiraUrl: null });
        return;
      }

      setSync({
        status: "synced",
        jiraIssueKey: data.jiraIssueKey,
        jiraUrl: data.jiraUrl,
      });
    } catch {
      setError("Failed to sync to Jira — check your connection");
      setSync({ status: "failed", jiraIssueKey: null, jiraUrl: null });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary disabled:opacity-50"
        >
          {syncing
            ? "Syncing…"
            : sync?.status === "synced"
              ? "Re-sync to Jira"
              : "Sync to Jira"}
        </button>

        {sync?.status === "synced" && sync.jiraUrl && (
          <a
            href={sync.jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[6px] bg-success-tint px-2 py-1 text-[12px] font-medium text-success"
          >
            Synced — {sync.jiraIssueKey}
          </a>
        )}

        {sync?.status === "failed" && !error && (
          <span className="rounded-[6px] bg-danger-tint px-2 py-1 text-[12px] font-medium text-danger">
            Sync failed
          </span>
        )}
      </div>
      {error && <p className="text-[12px] font-medium text-danger">{error}</p>}
    </div>
  );
}
