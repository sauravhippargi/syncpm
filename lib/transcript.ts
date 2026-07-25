export const ALLOWED_EXTENSIONS = ["txt", "vtt", "srt"] as const;
export type TranscriptFileType = (typeof ALLOWED_EXTENSIONS)[number];

export const MAX_TRANSCRIPT_BYTES = 2 * 1024 * 1024; // 2MB per rules.md

export function isAllowedExtension(ext: string): ext is TranscriptFileType {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function extensionFromFilename(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
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
