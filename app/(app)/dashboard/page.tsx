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

  const mostRecent = transcripts[0];
  const recentBlockerCount = mostRecent.actionItems.filter(
    (item) => item.isBlocker
  ).length;

  const upcomingDeadlines = openItems
    .filter((item) => item.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 3);

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
            Most recent transcript
          </p>
          <h2 className="mt-1 text-[14px] font-medium text-text-primary">
            {mostRecent.title || "Untitled meeting"}
          </h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            {mostRecent.actionItems.length} action item
            {mostRecent.actionItems.length === 1 ? "" : "s"} ·{" "}
            {recentBlockerCount} blocker{recentBlockerCount === 1 ? "" : "s"}
          </p>
          <Link
            href={`/review/${mostRecent.id}`}
            className="mt-3 inline-flex h-8 items-center rounded-[6px] border border-border px-3 text-[12px] font-medium text-text-primary"
          >
            View details
          </Link>
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
            <ul className="mt-3 flex flex-col gap-2">
              {upcomingDeadlines.map((item) => {
                const dueDateUTC = item.dueDate?.toISOString().slice(0, 10);
                const overdue = dueDateUTC !== undefined && dueDateUTC < todayUTC;
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="text-text-primary">
                      {item.description || "Untitled action item"}
                    </span>
                    <span
                      className={
                        overdue
                          ? "font-medium text-danger"
                          : "text-text-secondary"
                      }
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
