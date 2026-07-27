export interface DeadlineItemData {
  id: string;
  description: string;
  owner: string | null;
  dueDate: string; // ISO date-only (YYYY-MM-DD) or full ISO, always UTC midnight
  blockerNote: string | null;
  transcriptId: string;
  transcriptTitle: string | null;
}

export interface DeadlineGroup {
  key: string; // YYYY-MM-DD (UTC)
  label: string; // e.g. "July 27, 2026"
  items: DeadlineItemData[];
}

function dueDateKey(iso: string): string {
  return iso.slice(0, 10);
}

// The date established by the group header (prd.md 6.8) — long form so it
// reads as a heading, e.g. "July 27, 2026". Formatted in UTC to match how
// the date-only due dates are stored (UTC midnight), so the day never shifts
// by the viewer's timezone.
function formatDateHeader(key: string): string {
  return new Date(`${key}T00:00:00.000Z`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function bucketByDueDate(items: DeadlineItemData[]): DeadlineGroup[] {
  const groups: DeadlineGroup[] = [];
  for (const item of items) {
    const key = dueDateKey(item.dueDate);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, label: formatDateHeader(key), items: [item] });
    }
  }
  return groups;
}

// Splits into missed (strictly before today) and upcoming (today or later),
// each grouped under a shared date header (prd.md 6.8). Re-sorts from
// scratch every call rather than assuming the input is already ordered —
// this runs again after every inline due-date edit, when an item's new date
// may belong anywhere in the list, not just append to the end.
export function groupDeadlines(
  items: DeadlineItemData[],
  todayUTC: string
): { missed: DeadlineGroup[]; upcoming: DeadlineGroup[] } {
  const sorted = [...items].sort((a, b) =>
    dueDateKey(a.dueDate).localeCompare(dueDateKey(b.dueDate))
  );
  const missed = sorted.filter((item) => dueDateKey(item.dueDate) < todayUTC);
  const upcoming = sorted.filter((item) => dueDateKey(item.dueDate) >= todayUTC);
  return { missed: bucketByDueDate(missed), upcoming: bucketByDueDate(upcoming) };
}
