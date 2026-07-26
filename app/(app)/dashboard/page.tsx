import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isBlockerNote } from "@/lib/action-items";
import DashboardEmptyState from "@/components/DashboardEmptyState";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [transcripts, fathomConnection] = await Promise.all([
    prisma.transcript.findMany({
      where: { userId: session.user.id },
      include: { actionItems: { include: { jiraSyncLogs: true } } },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.fathomConnection.findUnique({ where: { userId: session.user.id } }),
  ]);

  const header = (
    <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary">
      Dashboard
    </h1>
  );

  if (transcripts.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-6 py-10">
        {header}
        <DashboardEmptyState fathomConnected={!!fathomConnection} />
      </main>
    );
  }

  const allItems = transcripts.flatMap((t) => t.actionItems);
  const openItems = allItems.filter((item) => item.status === "open");

  // The four stat cards must mirror the Action Items tab's own query exactly
  // (isApproved: true, prd.md 6.3a) so a KPI number never disagrees with what
  // that tab actually lists. Recent Transcripts' pill counts (allItems) and
  // the Upcoming Deadlines preview (openItems) intentionally stay unscoped,
  // matching the standalone Deadlines tab's own query, which also doesn't
  // filter by isApproved.
  const approvedItems = allItems.filter((item) => item.isApproved);
  const openApprovedItems = approvedItems.filter((item) => item.status === "open");
  const approvedBlockers = openApprovedItems.filter((item) => isBlockerNote(item.blockerNote));
  const doneApprovedItems = approvedItems.filter((item) => item.status === "done");
  const syncedCount = approvedItems.reduce(
    (sum, item) =>
      sum + item.jiraSyncLogs.filter((log) => log.status === "synced").length,
    0
  );

  const recentTranscripts = transcripts.slice(0, 5);

  const upcomingDeadlines = openItems
    .filter((item) => item.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 10);

  // Due dates are date-only values stored at UTC midnight — format and compare
  // them in UTC so the calendar date shown never shifts based on the
  // viewer's local timezone (e.g. UTC-7 rendering "2026-07-25" as "7/24").
  const todayUTC = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-6 py-10">
      {header}

      <div className="grid grid-cols-4 gap-3">
        <StatTile
          label="Open action items"
          value={openApprovedItems.length}
          href="/action-items"
        />
        <StatTile
          label="Blockers"
          value={approvedBlockers.length}
          tone="warning"
        />
        <StatTile
          label="Completed action items"
          value={doneApprovedItems.length}
          tone="success"
        />
        <StatTile label="Tickets raised" value={syncedCount} tone="jira" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-[10px] border border-border bg-card p-4 shadow-card">
          <p className="text-[14px] font-semibold text-text-primary">
            Recent transcripts
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-row-divider">
            {recentTranscripts.map((t) => {
              const blockerCount = t.actionItems.filter((item) =>
                isBlockerNote(item.blockerNote)
              ).length;
              return (
                <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/review/${t.id}`} className="group flex flex-col">
                    <span className="mb-1.5 truncate text-[14.5px] font-semibold text-text-primary group-hover:text-accent">
                      {t.title || "Untitled meeting"}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-text-secondary">
                      <span className="inline-flex items-center rounded-full bg-neutral-pill-bg px-2 py-0.5 text-[11.5px] font-semibold text-neutral-pill-text">
                        {t.actionItems.length} action item
                        {t.actionItems.length === 1 ? "" : "s"}
                      </span>
                      {blockerCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-warning-tint px-2 py-0.5 text-[11.5px] font-semibold text-warning-text">
                          {blockerCount} blocker{blockerCount === 1 ? "" : "s"}
                        </span>
                      )}
                      <span>· {t.uploadedAt.toLocaleString()}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-[10px] border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-text-primary">
              Upcoming deadlines
            </p>
            <Link
              href="/deadlines"
              className="text-[12px] font-medium text-accent"
            >
              View all
            </Link>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <p className="mt-3 text-[13px] text-text-secondary">
              No open items with a due date.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-row-divider">
              {upcomingDeadlines.map((item) => {
                const dueDateUTC = item.dueDate?.toISOString().slice(0, 10);
                const overdue = dueDateUTC !== undefined && dueDateUTC < todayUTC;
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-[14.5px] font-normal leading-[1.4] text-text-primary">
                      {item.description || "Untitled action item"}
                    </span>
                    <span
                      className={`shrink-0 text-[12.5px] ${
                        overdue ? "font-medium text-danger" : "text-text-secondary"
                      }`}
                    >
                      {item.dueDate?.toLocaleDateString(undefined, {
                        timeZone: "UTC",
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

function StatTile({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone?: "warning" | "success" | "jira";
  href?: string;
}) {
  const valueColor =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : tone === "jira"
          ? "text-jira-blue"
          : "text-accent";
  const dotColor =
    tone === "warning"
      ? "bg-warning"
      : tone === "success"
        ? "bg-success"
        : tone === "jira"
          ? "bg-jira-blue"
          : "bg-accent";

  const content = (
    <>
      <p
        className={`mb-1.5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] ${valueColor}`}
      >
        {value}
      </p>
      <p className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
        {label}
      </p>
    </>
  );

  const className =
    "rounded-[10px] border border-border bg-card px-5 pt-5 pb-[18px] shadow-card";

  if (href) {
    return (
      <Link href={href} className={`${className} transition-colors hover:border-accent`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
