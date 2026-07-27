import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isBlockerNote } from "@/lib/action-items";

type DeadlineItem = Prisma.ActionItemGetPayload<{ include: { transcript: true } }>;

interface DeadlineGroup {
  key: string; // YYYY-MM-DD (UTC)
  label: string; // e.g. "July 27, 2026"
  items: DeadlineItem[];
}

// The date established by the group header (prd.md 6.8) — long form so it
// reads as a heading, e.g. "July 27, 2026". Formatted in UTC to match how
// the date-only due dates are stored (UTC midnight), so the day never shifts
// by the viewer's timezone.
function formatDateHeader(dueDate: Date): string {
  return dueDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Buckets an already-date-ascending list into per-day groups. Because the
// input is sorted, same-day items are adjacent, so appending to the last
// group when the key matches preserves order without a full scan.
function groupByDueDate(items: DeadlineItem[]): DeadlineGroup[] {
  const groups: DeadlineGroup[] = [];
  for (const item of items) {
    const key = item.dueDate!.toISOString().slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, label: formatDateHeader(item.dueDate!), items: [item] });
    }
  }
  return groups;
}

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
  // UTC so "missed" (strictly before today) never shifts based on the
  // viewer's local timezone (e.g. UTC-7 rendering "2026-07-25" as "7/24").
  const todayUTC = new Date().toISOString().slice(0, 10);

  // "Missed" is strictly before today; something due today itself is still
  // upcoming, not missed (prd.md 6.8).
  const missedGroups = groupByDueDate(
    items.filter((item) => item.dueDate!.toISOString().slice(0, 10) < todayUTC)
  );
  const upcomingGroups = groupByDueDate(
    items.filter((item) => item.dueDate!.toISOString().slice(0, 10) >= todayUTC)
  );

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
        <div className="flex flex-col gap-6">
          {/* Missed only renders when something actually qualifies — no empty
              header (prd.md 6.8). Upcoming is guarded the same way for the
              all-missed edge case, following design.md's "don't show an empty
              section header" principle; since items exist, at least one of the
              two sections always renders. */}
          {missedGroups.length > 0 && (
            <DeadlineSection
              title="Missed Deadlines"
              variant="missed"
              groups={missedGroups}
            />
          )}
          {upcomingGroups.length > 0 && (
            <DeadlineSection
              title="Upcoming Deadlines"
              variant="upcoming"
              groups={upcomingGroups}
            />
          )}
        </div>
      )}
    </main>
  );
}

function DeadlineSection({
  title,
  variant,
  groups,
}: {
  title: string;
  variant: "missed" | "upcoming";
  groups: DeadlineGroup[];
}) {
  const missed = variant === "missed";
  return (
    <section className="flex flex-col gap-3">
      <h2
        className={`text-[14px] font-semibold ${
          missed ? "text-danger" : "text-text-primary"
        }`}
      >
        {title}
      </h2>
      <div className="rounded-[10px] border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              <p
                className={`text-[12.5px] font-medium ${
                  missed ? "text-danger" : "text-text-secondary"
                }`}
              >
                {group.label}
              </p>
              <ul className="flex flex-col divide-y divide-row-divider">
                {group.items.map((item) => (
                  <DeadlineRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// The due date is no longer shown per-row — it's established once by the
// group's date header (prd.md 6.8). Everything else on the row stays: owner
// pill, blocker tag, and the source-transcript link.
function DeadlineRow({ item }: { item: DeadlineItem }) {
  return (
    <li className="flex flex-col py-3 first:pt-0 last:pb-0">
      <span className="mb-1.5 text-[14.5px] font-normal text-text-primary">
        {item.description || "Untitled action item"}
      </span>

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
}
