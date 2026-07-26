import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isBlockerNote } from "@/lib/action-items";

export default async function DeadlinesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [items, approvedCount] = await Promise.all([
    prisma.actionItem.findMany({
      where: {
        status: "open",
        isApproved: true,
        dueDate: { not: null },
        transcript: { userId: session.user.id },
      },
      include: { transcript: true },
      orderBy: { dueDate: "asc" },
    }),
    // Checked independently of the due-date-filtered query above, so the
    // empty state can tell apart "no approved items at all" from "approved
    // items exist, just none with a due date set yet" (prd.md 6.8).
    prisma.actionItem.count({
      where: { isApproved: true, transcript: { userId: session.user.id } },
    }),
  ]);

  // Due dates are date-only values stored at UTC midnight — compare them in
  // UTC so "overdue" and the displayed date never shift based on the
  // viewer's local timezone (e.g. UTC-7 rendering "2026-07-25" as "7/24").
  const todayUTC = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.01em] text-text-primary">
        Deadlines
      </h1>

      {items.length === 0 ? (
        // Two distinct empty states, not one (prd.md 6.8) — tell apart "no
        // approved items exist at all" from "approved items exist, just
        // none with a due date set yet." Uploading another transcript
        // doesn't fix the second case, so it gets a different CTA.
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          {approvedCount === 0 ? (
            <>
              <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
                No action items yet — upload a transcript to start tracking
                deadlines.
              </p>
              <Link
                href="/upload"
                className="flex h-8 items-center rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
              >
                Upload a transcript
              </Link>
            </>
          ) : (
            <>
              <p className="max-w-sm text-[14px] leading-[1.5] text-text-secondary">
                Your action items don&apos;t have due dates yet — add one to
                start tracking deadlines here.
              </p>
              <Link
                href="/action-items"
                className="flex h-8 items-center rounded-[6px] bg-accent px-3 text-[12px] font-medium text-white"
              >
                Go to Action items
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-[10px] border border-border bg-card p-4 shadow-card">
          <ul className="flex flex-col divide-y divide-row-divider">
            {items.map((item) => {
              const dueDateUTC = item.dueDate!.toISOString().slice(0, 10);
              const overdue = dueDateUTC < todayUTC;
              return (
                <li
                  key={item.id}
                  className="flex flex-col py-3 first:pt-0 last:pb-0"
                >
                  <div className="mb-1.5 flex items-start justify-between gap-4">
                    <span className="text-[14.5px] font-normal text-text-primary">
                      {item.description || "Untitled action item"}
                    </span>
                    <span
                      className={`shrink-0 text-[12.5px] font-medium ${
                        overdue ? "text-danger" : "text-text-secondary"
                      }`}
                    >
                      {overdue ? "Overdue — " : ""}
                      {item.dueDate!.toLocaleDateString(undefined, {
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-text-secondary">
                    <span className="rounded-[6px] bg-accent-tint px-2 py-1 font-medium text-accent">
                      {item.owner || "Unassigned"}
                    </span>
                    {isBlockerNote(item.blockerNote) && (
                      <span className="rounded-[6px] bg-warning-tint px-2 py-1 font-medium text-warning-text">
                        Blocker
                      </span>
                    )}
                    <Link
                      href={`/review/${item.transcriptId}`}
                      className="ml-auto text-text-secondary hover:underline"
                    >
                      {item.transcript.title || "Untitled meeting"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
