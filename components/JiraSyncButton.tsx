"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import RaiseATicketModal from "./RaiseATicketModal";

export interface JiraSyncState {
  status: "synced" | "failed";
  jiraIssueKey: string | null;
  jiraUrl: string | null;
}

export interface JiraConnectionSummary {
  siteName: string;
  projectKey: string | null;
}

export default function JiraSyncButton({
  actionItemId,
  approved,
  owner,
  isBlocker,
  jiraConnection,
  initialSync,
}: {
  actionItemId: string;
  approved: boolean;
  owner: string | null;
  isBlocker: boolean;
  jiraConnection: JiraConnectionSummary | null;
  initialSync: JiraSyncState | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sync, setSync] = useState<JiraSyncState | null>(initialSync);
  // Reopen automatically after returning from the Jira OAuth consent screen,
  // when this is the item the connect flow started from (architecture.md
  // section 5, "OAuth return context").
  const [modalOpen, setModalOpen] = useState(
    () => searchParams.get("openTicketModal") === actionItemId
  );

  // Strip the query param once consumed, so a page refresh doesn't reopen it.
  useEffect(() => {
    if (searchParams.get("openTicketModal") === actionItemId) {
      const params = new URLSearchParams(searchParams);
      params.delete("openTicketModal");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!approved) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary"
        >
          {sync?.status === "synced" ? "Re-raise a ticket" : "Raise a ticket"}
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

        {sync?.status === "failed" && (
          <span className="rounded-[6px] bg-danger-tint px-2 py-1 text-[12px] font-medium text-danger">
            Sync failed
          </span>
        )}
      </div>

      {modalOpen && (
        <RaiseATicketModal
          actionItemId={actionItemId}
          owner={owner}
          isBlocker={isBlocker}
          jiraConnection={jiraConnection}
          onClose={() => setModalOpen(false)}
          onCreated={(result) => {
            setSync({
              status: "synced",
              jiraIssueKey: result.jiraIssueKey,
              jiraUrl: result.jiraUrl,
            });
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
