import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ReviewScreen from "@/components/ReviewScreen";
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
    include: { actionItems: { orderBy: { id: "asc" } } },
  });

  if (!transcript) notFound();

  const items: ActionItem[] = transcript.actionItems.map((item) => ({
    id: item.id,
    description: item.description,
    owner: item.owner,
    dueDate: item.dueDate ? item.dueDate.toISOString() : null,
    status: item.status,
    isBlocker: item.isBlocker,
    blockerNote: item.blockerNote,
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
          {transcript.title || "Untitled meeting"}
        </h1>
        <p className="text-[13px] leading-[1.4] text-text-secondary">
          Uploaded {transcript.uploadedAt.toLocaleString()} — review, edit, or add action items
          below.
        </p>
      </div>
      <ReviewScreen transcriptId={transcript.id} initialItems={items} />
    </main>
  );
}
