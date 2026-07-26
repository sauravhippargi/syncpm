import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isBlockerNote } from "@/lib/action-items";
import DashboardEmptyState from "@/components/DashboardEmptyState";
import DashboardBody from "@/components/DashboardBody";

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

  // The four stat cards, and the Upcoming Deadlines preview below, must all
  // mirror the Action Items tab's own query (isApproved: true, prd.md 6.3a/
  // 6.6/6.8) so none of them ever disagree with what that tab actually
  // lists — an item still sitting unreviewed on Review & Edit shouldn't
  // count toward, or show up in, any of these. Recent Transcripts' pill
  // counts (allItems) intentionally stay unscoped — those are raw
  // extraction counts for the transcript, not approval-gated data.
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

  const upcomingDeadlines = openApprovedItems
    .filter((item) => item.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 10);

  // Due dates are date-only values stored at UTC midnight — format and compare
  // them in UTC so the calendar date shown never shifts based on the
  // viewer's local timezone (e.g. UTC-7 rendering "2026-07-25" as "7/24").
  const todayUTC = new Date().toISOString().slice(0, 10);

  const recentTranscriptRows = recentTranscripts.map((t) => ({
    id: t.id,
    title: t.title || "Untitled meeting",
    actionItemCount: t.actionItems.length,
    blockerCount: t.actionItems.filter((item) => isBlockerNote(item.blockerNote))
      .length,
    uploadedAtLabel: t.uploadedAt.toLocaleString(),
  }));

  const upcomingDeadlineRows = upcomingDeadlines.map((item) => {
    const dueDateUTC = item.dueDate?.toISOString().slice(0, 10);
    return {
      id: item.id,
      description: item.description || "Untitled action item",
      dueDateLabel:
        item.dueDate?.toLocaleDateString(undefined, { timeZone: "UTC" }) ?? "",
      overdue: dueDateUTC !== undefined && dueDateUTC < todayUTC,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-6 py-10">
      {header}

      <DashboardBody
        stats={{
          openActionItems: openApprovedItems.length,
          blockers: approvedBlockers.length,
          completedActionItems: doneApprovedItems.length,
          ticketsRaised: syncedCount,
        }}
        recentTranscripts={recentTranscriptRows}
        upcomingDeadlines={upcomingDeadlineRows}
      />
    </main>
  );
}
