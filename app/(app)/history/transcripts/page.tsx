import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DeleteTranscriptButton from "@/components/DeleteTranscriptButton";
import FathomBackfillButton from "@/components/FathomBackfillButton";
import { isBlockerNote } from "@/lib/action-items";

export default async function TranscriptHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [transcripts, fathomConnection] = await Promise.all([
    prisma.transcript.findMany({
      where: { userId: session.user.id },
      include: { actionItems: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.fathomConnection.findUnique({ where: { userId: session.user.id } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[19px] font-semibold leading-[1.3] text-text-primary">
            Transcript history
          </h1>
          <p className="text-[13px] leading-[1.4] text-text-secondary">
            Every meeting you&apos;ve uploaded, with its extracted action items
            and blockers.
          </p>
        </div>
        {fathomConnection && <FathomBackfillButton />}
      </div>

      {transcripts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
            No transcripts yet — upload your first meeting to start
            extracting action items, blockers, and tickets.
          </p>
          <Link
            href="/upload"
            className="flex h-8 items-center rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
          >
            Upload a transcript
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {transcripts.map((transcript) => {
            const blockerCount = transcript.actionItems.filter((item) =>
              isBlockerNote(item.blockerNote)
            ).length;
            return (
              <li
                key={transcript.id}
                className="flex items-center gap-2 rounded-[10px] border border-border bg-card p-4 transition-colors hover:border-accent"
              >
                <Link
                  href={`/review/${transcript.id}`}
                  className="flex flex-1 items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-text-primary">
                        {transcript.title || "Untitled meeting"}
                      </span>
                      <span
                        className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium ${
                          transcript.source === "fathom"
                            ? "bg-accent-tint text-accent"
                            : "bg-page text-text-secondary"
                        }`}
                      >
                        {transcript.source === "fathom" ? "Fathom" : "Manual"}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-secondary">
                      Uploaded {transcript.uploadedAt.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[12px] text-text-secondary">
                    <span>
                      {transcript.actionItems.length} action item
                      {transcript.actionItems.length === 1 ? "" : "s"}
                    </span>
                    {blockerCount > 0 && (
                      <span className="rounded-[6px] bg-warning-tint px-2 py-1 font-medium text-warning">
                        {blockerCount} blocker{blockerCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </Link>
                <DeleteTranscriptButton
                  transcriptId={transcript.id}
                  title={transcript.title || "Untitled meeting"}
                  actionItemCount={transcript.actionItems.length}
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
