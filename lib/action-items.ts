// A non-empty blocker_note is the sole signal that an action item is a
// blocker — there's no separate boolean to keep in sync with it
// (architecture.md section 4).
export function isBlockerNote(blockerNote: string | null | undefined): boolean {
  return !!blockerNote && blockerNote.trim() !== "";
}
