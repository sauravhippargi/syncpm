export const ALLOWED_EXTENSIONS = ["txt", "vtt", "srt"] as const;
export type TranscriptFileType = (typeof ALLOWED_EXTENSIONS)[number];

export const MAX_TRANSCRIPT_BYTES = 2 * 1024 * 1024; // 2MB per rules.md

export function isAllowedExtension(ext: string): ext is TranscriptFileType {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function extensionFromFilename(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

// Falls back to this when the optional meeting title is left blank, on
// either the paste-text or file-upload path (prd.md 6.1) — e.g.
// "Meeting — Jul 25, 2026, 3:42 PM" — so entries stay distinguishable at a
// glance instead of all reading "Untitled meeting".
export function defaultTranscriptTitle(date: Date): string {
  const formatted = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Meeting — ${formatted}`;
}

// Checked *before* creating a transcript row or spending a Gemini call
// (rules.md §2, empty transcript text). Fathom can return an empty transcript
// for a recording with no captured speech — importing it produces a row that
// can only ever show zero action items, and extracting from an empty string
// spends a request from a 20/day budget to learn nothing. Both import paths
// skip instead, with a reason.
export function isEmptyTranscriptText(rawText: string | null | undefined): boolean {
  return !rawText || rawText.trim().length === 0;
}

// Strips VTT/SRT cue numbers and timestamp lines, keeping spoken text (with
// speaker labels, if present) so Gemini extracts against clean transcript text.
export function normalizeTranscript(
  rawText: string,
  fileType?: TranscriptFileType
): string {
  if (fileType === "vtt" || fileType === "srt") {
    return rawText
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        if (trimmed === "WEBVTT") return false;
        if (/^\d+$/.test(trimmed)) return false; // cue number
        if (/-->/.test(trimmed)) return false; // timestamp line
        return true;
      })
      .join("\n")
      .trim();
  }
  return rawText.trim();
}
