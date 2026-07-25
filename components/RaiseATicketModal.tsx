"use client";

import { useEffect, useState } from "react";
import ConnectorPicker from "./ConnectorPicker";
import type { JiraConnectionSummary } from "./JiraSyncButton";

interface AssignableUser {
  accountId: string;
  displayName: string;
}

interface JiraProject {
  key: string;
  name: string;
}

const JIRA_PRIORITIES = ["Highest", "High", "Medium", "Low", "Lowest"];

// Best-effort case-insensitive match against the extracted owner string —
// a convenience default only, always overridable in the dropdown
// (architecture.md section 5, "Assignee resolution").
function findBestAssigneeMatch(
  owner: string | null,
  users: AssignableUser[]
): string {
  const ownerLower = owner?.trim().toLowerCase();
  if (!ownerLower) return "";

  const exact = users.find((u) => u.displayName.toLowerCase() === ownerLower);
  if (exact) return exact.accountId;

  const substring = users.find(
    (u) =>
      u.displayName.toLowerCase().includes(ownerLower) ||
      ownerLower.includes(u.displayName.toLowerCase())
  );
  if (substring) return substring.accountId;

  const ownerTokens = ownerLower.split(/\s+/).filter(Boolean);
  const tokenMatch = users.find((u) => {
    const nameTokens = u.displayName.toLowerCase().split(/\s+/).filter(Boolean);
    return ownerTokens.some((t) => nameTokens.includes(t));
  });
  return tokenMatch ? tokenMatch.accountId : "";
}

export default function RaiseATicketModal({
  actionItemId,
  owner,
  isBlocker,
  jiraConnection,
  onClose,
  onCreated,
}: {
  actionItemId: string;
  owner: string | null;
  isBlocker: boolean;
  jiraConnection: JiraConnectionSummary | null;
  onClose: () => void;
  onCreated: (result: { jiraIssueKey: string; jiraUrl: string }) => void;
}) {
  const connected = !!jiraConnection;

  const [projects, setProjects] = useState<JiraProject[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(
    () => jiraConnection?.projectKey ?? ""
  );

  const [users, setUsers] = useState<AssignableUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectionExpired, setConnectionExpired] = useState(false);

  const [assigneeAccountId, setAssigneeAccountId] = useState("");
  const [priority, setPriority] = useState(isBlocker ? "High" : "Medium");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;

    async function loadProjects() {
      try {
        const res = await fetch("/api/integrations/jira/projects");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setProjectsError(data.error || "Failed to load Jira projects");
          setConnectionExpired(data.code === "CONNECTION_EXPIRED");
          return;
        }
        setProjects(data.projects);
        // Fall back to the first accessible project if there's no stored
        // default yet — always overridable via the dropdown (PRD 6.4).
        setSelectedProjectKey(
          (prev: string) => prev || jiraConnection?.projectKey || data.projects[0]?.key || ""
        );
      } catch {
        if (!cancelled) setProjectsError("Failed to load Jira projects");
      }
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    if (!connected || !selectedProjectKey) return;
    let cancelled = false;

    async function loadUsers() {
      try {
        const res = await fetch(
          `/api/integrations/jira/assignable-users?projectKey=${encodeURIComponent(selectedProjectKey)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error || "Failed to load assignable users");
          setConnectionExpired(data.code === "CONNECTION_EXPIRED");
          return;
        }
        setUsers(data.users);
        setAssigneeAccountId(findBestAssigneeMatch(owner, data.users));
      } catch {
        if (!cancelled) setLoadError("Failed to load assignable users");
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, selectedProjectKey]);

  function handleProjectChange(projectKey: string) {
    setSelectedProjectKey(projectKey);
    // Clear the stale accountId immediately rather than leaving the old
    // project's selection visible while the new list loads.
    setUsers(null);
    setAssigneeAccountId("");
    setLoadError(null);
    setConnectionExpired(false);
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    setConnectionExpired(false);
    try {
      const res = await fetch("/api/jira/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionItemId,
          projectKey: selectedProjectKey,
          assigneeAccountId: assigneeAccountId || null,
          priority,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create ticket");
        setConnectionExpired(data.code === "CONNECTION_EXPIRED");
        return;
      }
      onCreated({ jiraIssueKey: data.jiraIssueKey, jiraUrl: data.jiraUrl });
    } catch {
      setCreateError("Failed to create ticket — check your connection");
    } finally {
      setCreating(false);
    }
  }

  const connectHref = `/api/integrations/jira/connect?actionItemId=${encodeURIComponent(actionItemId)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !creating) onClose();
      }}
    >
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-[10px] border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-medium leading-[1.4] text-text-primary">
            Raise a ticket
          </h2>
          <p className="text-[13px] leading-[1.4] text-text-secondary">
            {connected
              ? "Creating a ticket via Jira"
              : "Connect a tool to create a ticket for this action item."}
          </p>
        </div>

        {!connected ? (
          <ConnectorPicker connectHref={connectHref} />
        ) : projectsError ? (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-danger">{projectsError}</p>
            {connectionExpired && (
              <a
                href={connectHref}
                className="text-[13px] font-medium text-accent underline"
              >
                Reconnect
              </a>
            )}
          </div>
        ) : !projects ? (
          <p className="text-[13px] text-text-secondary">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="rounded-[10px] border border-danger-tint bg-danger-tint px-3 py-2 text-[13px] font-medium text-danger">
            No accessible Jira projects found for this connection.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ticket-project"
                className="text-[12px] font-medium text-text-secondary"
              >
                Project
              </label>
              <select
                id="ticket-project"
                value={selectedProjectKey}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="h-8 w-full max-w-xs rounded-[6px] border border-border bg-card px-2 text-[13px] text-text-primary outline-none focus:border-accent"
              >
                {!selectedProjectKey && (
                  <option value="" disabled>
                    Choose a project…
                  </option>
                )}
                {projects.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            {loadError ? (
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-medium text-danger">{loadError}</p>
                {connectionExpired && (
                  <a
                    href={connectHref}
                    className="text-[13px] font-medium text-accent underline"
                  >
                    Reconnect
                  </a>
                )}
              </div>
            ) : !users ? (
              <p className="text-[13px] text-text-secondary">
                Loading assignable users…
              </p>
            ) : (
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="ticket-assignee"
                    className="text-[12px] font-medium text-text-secondary"
                  >
                    Assignee
                  </label>
                  <select
                    id="ticket-assignee"
                    value={assigneeAccountId}
                    onChange={(e) => setAssigneeAccountId(e.target.value)}
                    className="h-8 w-56 rounded-[6px] border border-border bg-card px-2 text-[13px] text-text-primary outline-none focus:border-accent"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.accountId} value={u.accountId}>
                        {u.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="ticket-priority"
                    className="text-[12px] font-medium text-text-secondary"
                  >
                    Priority
                  </label>
                  <select
                    id="ticket-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="h-8 w-40 rounded-[6px] border border-border bg-card px-2 text-[13px] text-text-primary outline-none focus:border-accent"
                  >
                    {JIRA_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {createError && (
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-medium text-danger">{createError}</p>
            {connectionExpired && (
              <a
                href={connectHref}
                className="text-[12px] font-medium text-accent underline"
              >
                Reconnect
              </a>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          {connected && selectedProjectKey && users && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="h-8 rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create ticket"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
