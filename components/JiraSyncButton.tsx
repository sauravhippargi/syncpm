"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface JiraSyncState {
  status: "synced" | "failed";
  jiraIssueKey: string | null;
  jiraUrl: string | null;
}

export default function JiraSyncButton({
  actionItemId,
  approved,
  hasJiraConnection,
  initialSync,
}: {
  actionItemId: string;
  approved: boolean;
  hasJiraConnection: boolean;
  initialSync: JiraSyncState | null;
}) {
  const router = useRouter();
  const [sync, setSync] = useState<JiraSyncState | null>(initialSync);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionExpired, setConnectionExpired] = useState(false);

  if (!approved) return null;

  async function handleClick() {
    // Not connected yet — route to the Raise a ticket tab instead of
    // attempting a sync (rules.md section 2).
    if (!hasJiraConnection) {
      router.push("/raise-a-ticket");
      return;
    }

    setSyncing(true);
    setError(null);
    setConnectionExpired(false);
    try {
      const res = await fetch("/api/jira/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItemId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to sync to Jira");
        setConnectionExpired(data.code === "CONNECTION_EXPIRED");
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
          onClick={handleClick}
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
      {error && (
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-medium text-danger">{error}</p>
          {connectionExpired && (
            <a
              href="/raise-a-ticket"
              className="text-[12px] font-medium text-accent underline"
            >
              Reconnect
            </a>
          )}
        </div>
      )}
    </div>
  );
}
