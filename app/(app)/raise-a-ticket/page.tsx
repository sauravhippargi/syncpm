import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ConnectorPicker from "@/components/ConnectorPicker";
import ProjectSelector from "@/components/ProjectSelector";
import JiraDisconnectButton from "@/components/JiraDisconnectButton";

const JIRA_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You declined to connect Jira — connect again when ready.",
  state_mismatch:
    "Something didn't match up during the Jira connection — try connecting again.",
  no_accessible_site:
    "That Atlassian account doesn't have access to any Jira site.",
  token_exchange_failed:
    "Failed to complete the Jira connection — try again.",
};

export default async function RaiseATicketPage({
  searchParams,
}: {
  searchParams: Promise<{ jira_error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const { jira_error } = await searchParams;
  const errorMessage = jira_error ? JIRA_ERROR_MESSAGES[jira_error] : null;

  const connection = await prisma.jiraConnection.findUnique({
    where: { userId: session.user.id },
  });

  const recentTickets = connection
    ? await prisma.jiraSyncLog.findMany({
        where: { actionItem: { transcript: { userId: session.user.id } } },
        orderBy: { syncedAt: "desc" },
        take: 20,
        include: { actionItem: true },
      })
    : [];

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
          Raise a ticket
        </h1>
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Connect a tool to turn approved action items into real tickets.
        </p>
      </div>

      {errorMessage && (
        <p className="rounded-[10px] border border-danger-tint bg-danger-tint px-3 py-2 text-[13px] font-medium text-danger">
          {errorMessage}
        </p>
      )}

      {!connection ? (
        <ConnectorPicker />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-[10px] border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-[12px] font-medium text-text-secondary">
                  Connected to Jira
                </p>
                <p className="text-[14px] font-medium text-text-primary">
                  {connection.siteName}
                </p>
                <p className="text-[12px] text-text-secondary">
                  {connection.siteUrl}
                </p>
              </div>
              <JiraDisconnectButton />
            </div>

            <ProjectSelector initialProjectKey={connection.projectKey} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[12px] font-medium text-text-secondary">
              Recently created tickets
            </p>

            {recentTickets.length === 0 ? (
              <p className="text-[13px] text-text-secondary">
                No tickets synced yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentTickets.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-card px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-text-primary">
                        {log.actionItem.description || "Untitled action item"}
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        {log.syncedAt.toLocaleString()}
                      </span>
                    </div>
                    {log.status === "synced" && log.jiraUrl ? (
                      <a
                        href={log.jiraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[6px] bg-success-tint px-2 py-1 text-[12px] font-medium text-success"
                      >
                        {log.jiraIssueKey}
                      </a>
                    ) : (
                      <span className="rounded-[6px] bg-danger-tint px-2 py-1 text-[12px] font-medium text-danger">
                        Failed
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
