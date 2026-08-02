"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import RaiseATicketModal, {
  findBestAssigneeMatch,
  type AssignableUser,
  type JiraProject,
} from "./RaiseATicketModal";

export interface JiraSyncState {
  status: "synced" | "failed";
  jiraIssueKey: string | null;
  jiraUrl: string | null;
}

export interface JiraConnectionSummary {
  siteName: string;
  projectKey: string | null;
}

// Lives in ActionItemRow (Action Items tab) now, not ActionItemCard — every
// row it's rendered for is already approved, so there's no approval gating
// here anymore (prd.md 6.3a).
export default function JiraSyncButton({
  actionItemId,
  owner,
  blockerNote,
  jiraConnection,
  initialSync,
}: {
  actionItemId: string;
  owner: string | null;
  blockerNote: string | null;
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

  // Projects/users for RaiseATicketModal are fetched from here, not from an
  // effect inside that component — an event handler (this button's click)
  // only ever runs once per real click, unlike a useEffect on mount, which
  // React's StrictMode intentionally double-invokes in development. That
  // was silently sending every Jira API call twice.
  const [projects, setProjects] = useState<JiraProject[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [connectionExpired, setConnectionExpired] = useState(false);
  const [selectedProjectKey, setSelectedProjectKey] = useState(
    () => jiraConnection?.projectKey ?? ""
  );
  const [users, setUsers] = useState<AssignableUser[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [assigneeAccountId, setAssigneeAccountId] = useState("");

  // Guards against an older in-flight assignable-users request clobbering
  // a newer one if the project dropdown is changed again before the first
  // response lands (previously handled by an effect-cleanup "cancelled"
  // flag; this is the imperative equivalent).
  const usersRequestId = useRef(0);

  async function loadUsersForProject(projectKey: string) {
    const requestId = ++usersRequestId.current;
    try {
      const res = await fetch(
        `/api/integrations/jira/assignable-users?projectKey=${encodeURIComponent(projectKey)}`
      );
      const data = await res.json();
      if (usersRequestId.current !== requestId) return;
      if (!res.ok) {
        setUsersError(data.error || "Failed to load assignable users");
        setConnectionExpired(data.code === "CONNECTION_EXPIRED");
        return;
      }
      setUsers(data.users);
      setAssigneeAccountId(findBestAssigneeMatch(owner, data.users));
    } catch {
      if (usersRequestId.current !== requestId) return;
      setUsersError("Failed to load assignable users");
    }
  }

  async function loadProjectsAndUsers() {
    setProjects(null);
    setProjectsError(null);
    setConnectionExpired(false);
    try {
      const res = await fetch("/api/integrations/jira/projects");
      const data = await res.json();
      if (!res.ok) {
        setProjectsError(data.error || "Failed to load Jira projects");
        setConnectionExpired(data.code === "CONNECTION_EXPIRED");
        return;
      }
      setProjects(data.projects);
      // Fall back to the first accessible project if there's no stored
      // default yet — always overridable via the dropdown (PRD 6.4).
      const defaultKey =
        selectedProjectKey || jiraConnection?.projectKey || data.projects[0]?.key || "";
      setSelectedProjectKey(defaultKey);
      if (defaultKey) loadUsersForProject(defaultKey);
    } catch {
      setProjectsError("Failed to load Jira projects");
    }
  }

  function handleProjectChange(projectKey: string) {
    setSelectedProjectKey(projectKey);
    // Clear the stale accountId immediately rather than leaving the old
    // project's selection visible while the new list loads.
    setUsers(null);
    setAssigneeAccountId("");
    setUsersError(null);
    setConnectionExpired(false);
    loadUsersForProject(projectKey);
  }

  function handleOpenModal() {
    setModalOpen(true);
    if (jiraConnection) loadProjectsAndUsers();
  }

  // Covers the OAuth-reopen case above, where the modal opens without a
  // click to hang the fetch off of. A ref guard makes this idempotent
  // under StrictMode's double-invoke — unlike a plain mount effect, which
  // is exactly what caused the double-fetch this whole refactor fixes.
  const didAutoLoad = useRef(false);
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: no click exists for this reopen path, see comment above
    if (modalOpen && jiraConnection) loadProjectsAndUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {sync?.status === "synced" && sync.jiraUrl ? (
          <a
            href={sync.jiraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[6px] bg-success-tint px-2 py-1 text-[12px] font-medium text-success"
          >
            Synced — {sync.jiraIssueKey}
          </a>
        ) : (
          <button
            type="button"
            onClick={handleOpenModal}
            className="h-8 rounded-[6px] border border-border bg-card px-3 text-[12px] font-medium text-text-primary"
          >
            Raise a ticket
          </button>
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
          blockerNote={blockerNote}
          jiraConnection={jiraConnection}
          projects={projects}
          projectsError={projectsError}
          connectionExpired={connectionExpired}
          selectedProjectKey={selectedProjectKey}
          onProjectChange={handleProjectChange}
          users={users}
          usersError={usersError}
          assigneeAccountId={assigneeAccountId}
          onAssigneeChange={setAssigneeAccountId}
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
