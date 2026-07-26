import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ReviewScreen from "@/components/ReviewScreen";
import TranscriptTitle from "@/components/TranscriptTitle";
import type { ActionItem } from "@/components/ActionItemCard";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ transcriptId: string }>;
  searchParams: Promise<{ focusItem?: string }>;
}) {
  const { transcriptId } = await params;
  const { focusItem } = await searchParams;

  // proxy.ts already redirects unauthenticated requests for /review, but data
  // access must never rely on that alone (rules.md section 3) — check again here.
  const session = await auth();
  if (!session?.user?.id) notFound();

  const transcript = await prisma.transcript.findFirst({
    where: { id: transcriptId, userId: session.user.id },
    include: {
      actionItems: { orderBy: { id: "asc" } },
    },
  });

  if (!transcript) notFound();

  const items: ActionItem[] = transcript.actionItems.map((item) => ({
    id: item.id,
    description: item.description,
    owner: item.owner,
    dueDate: item.dueDate ? item.dueDate.toISOString() : null,
    status: item.status,
    blockerNote: item.blockerNote,
    isApproved: item.isApproved,
  }));

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <TranscriptTitle
          transcriptId={transcript.id}
          initialTitle={transcript.title ?? ""}
        />
      </div>
      <ReviewScreen
        transcriptId={transcript.id}
        uploadedAt={transcript.uploadedAt.toLocaleString()}
        initialItems={items}
        focusItemId={focusItem}
      />
    </main>
  );
}
