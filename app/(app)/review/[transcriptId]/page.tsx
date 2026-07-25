import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ReviewScreen from "@/components/ReviewScreen";
import TranscriptTitle from "@/components/TranscriptTitle";
import type { ActionItem } from "@/components/ActionItemCard";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ transcriptId: string }>;
}) {
  const { transcriptId } = await params;

  // proxy.ts already redirects unauthenticated requests for /review, but data
  // access must never rely on that alone (rules.md section 3) — check again here.
  const session = await auth();
  if (!session?.user?.id) notFound();

  const transcript = await prisma.transcript.findFirst({
    where: { id: transcriptId, userId: session.user.id },
    include: {
      actionItems: {
        orderBy: { id: "asc" },
        include: { jiraSyncLogs: { orderBy: { syncedAt: "desc" }, take: 1 } },
      },
    },
  });

  if (!transcript) notFound();

  const jiraConnection = await prisma.jiraConnection.findUnique({
    where: { userId: session.user.id },
  });

  const items: ActionItem[] = transcript.actionItems.map((item) => {
    const latestSync = item.jiraSyncLogs[0];
    return {
      id: item.id,
      description: item.description,
      owner: item.owner,
      dueDate: item.dueDate ? item.dueDate.toISOString() : null,
      status: item.status,
      isBlocker: item.isBlocker,
      blockerNote: item.blockerNote,
      isApproved: item.isApproved,
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <TranscriptTitle
          transcriptId={transcript.id}
          initialTitle={transcript.title ?? ""}
        />
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Uploaded {transcript.uploadedAt.toLocaleString()} — review, edit, or add action items
          below.
        </p>
      </div>
      <ReviewScreen
        transcriptId={transcript.id}
        initialItems={items}
        hasJiraConnection={!!jiraConnection}
      />
    </main>
  );
}
