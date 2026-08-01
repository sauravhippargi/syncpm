import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ActionItemsList from "@/components/ActionItemsList";
import type { ActionItemRowData } from "@/components/ActionItemRow";

// The master list of every approved action item, across every transcript,
// past and present — not scoped to a single meeting (prd.md 6.3a).
export default async function ActionItemsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [items, jiraConnection] = await Promise.all([
    prisma.actionItem.findMany({
      where: { isApproved: true, transcript: { userId: session.user.id } },
      include: {
        transcript: true,
        jiraSyncLogs: { orderBy: { syncedAt: "desc" }, take: 1 },
      },
      orderBy: { id: "desc" },
    }),
    prisma.jiraConnection.findUnique({ where: { userId: session.user.id } }),
  ]);

  const connectionSummary = jiraConnection
    ? { siteName: jiraConnection.siteName, projectKey: jiraConnection.projectKey }
    : null;

  const rows: ActionItemRowData[] = items.map((item) => {
    const latestSync = item.jiraSyncLogs[0];
    return {
      id: item.id,
      description: item.description,
      owner: item.owner,
      ownerEvidence: item.ownerEvidence,
      dueDate: item.dueDate ? item.dueDate.toISOString() : null,
      status: item.status,
      blockerNote: item.blockerNote,
      transcriptId: item.transcriptId,
      transcriptTitle: item.transcript.title,
      jiraSync: latestSync
        ? {
            status: latestSync.status as "synced" | "failed",
            jiraIssueKey: latestSync.jiraIssueKey,
            jiraUrl: latestSync.jiraUrl,
          }
        : null,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary">
        Action Items
      </h1>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
            No approved action items yet — approve items on a transcript&apos;s
            Review &amp; Edit screen to see them here.
          </p>
        </div>
      ) : (
        <ActionItemsList initialItems={rows} jiraConnection={connectionSummary} />
      )}
    </main>
  );
}
