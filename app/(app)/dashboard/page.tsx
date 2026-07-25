import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const transcripts = await prisma.transcript.findMany({
    where: { userId: session.user.id },
    include: { actionItems: { include: { jiraSyncLogs: true } } },
    orderBy: { uploadedAt: "desc" },
  });

  if (transcripts.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
          No transcripts yet — upload your first meeting to start extracting
          action items, blockers, and tickets.
        </p>
        <Link
          href="/upload"
          className="flex h-8 items-center rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
        >
          Upload a transcript
        </Link>
      </main>
    );
  }

  const allItems = transcripts.flatMap((t) => t.actionItems);
  const openItems = allItems.filter((item) => item.status === "open");
  const openBlockers = openItems.filter((item) => item.isBlocker);
  const syncedCount = allItems.reduce(
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
    <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
          Dashboard
        </h1>
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          An overview of your open action items, blockers, and Jira sync
          status.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Open action items" value={openItems.length} />
        <StatTile
          label="Blockers"
          value={openBlockers.length}
          tone="warning"
        />
        <StatTile label="Synced to Jira" value={syncedCount} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-[10px] border border-border bg-card p-4">
          <p className="text-[12px] font-medium text-text-secondary">
            Recent transcripts
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {recentTranscripts.map((t) => {
              const blockerCount = t.actionItems.filter(
                (item) => item.isBlocker
              ).length;
              return (
                <li key={t.id}>
                  <Link
                    href={`/review/${t.id}`}
                    className="group flex flex-col gap-1 py-3.5 first:pt-0 last:pb-0"
                  >
                    <span className="truncate text-[13px] font-medium text-text-primary group-hover:text-accent">
                      {t.title || "Untitled meeting"}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {t.actionItems.length} action item
                      {t.actionItems.length === 1 ? "" : "s"} ·{" "}
                      {blockerCount} blocker{blockerCount === 1 ? "" : "s"} ·{" "}
                      {t.uploadedAt.toLocaleString()}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-[10px] border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-text-secondary">
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
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {upcomingDeadlines.map((item) => {
                const dueDateUTC = item.dueDate?.toISOString().slice(0, 10);
                const overdue = dueDateUTC !== undefined && dueDateUTC < todayUTC;
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 py-3.5 text-[13px] first:pt-0 last:pb-0"
                  >
                    <span className="leading-[1.4] text-text-primary">
                      {item.description || "Untitled action item"}
                    </span>
                    <span
                      className={`shrink-0 ${
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
}: {
  label: string;
  value: number;
  tone?: "warning" | "success";
}) {
  const valueColor =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : "text-text-primary";

  return (
    <div className="rounded-[10px] border border-border bg-card p-4">
      <p className="text-[12px] font-medium text-text-secondary">{label}</p>
      <p className={`mt-1 text-[19px] font-semibold ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}
