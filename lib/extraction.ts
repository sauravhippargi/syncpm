import { prisma } from "@/lib/db";
import { extractActionItems } from "@/lib/gemini";

// Shared by both ingestion paths (manual upload's /api/extract route, and the
// Fathom webhook route) so a Fathom-imported meeting runs through the exact
// same Gemini pipeline as a manual upload — SyncPM's own extraction stays the
// source of truth rather than Fathom's built-in action items (PRD 6.1a).
export async function runExtractionForTranscript(
  transcriptId: string,
  rawText: string
) {
  const items = await extractActionItems(rawText);

  return prisma.$transaction(
    items.map((item) =>
      prisma.actionItem.create({
        data: {
          transcriptId,
          description: item.description,
          owner: item.owner,
          ownerEvidence: item.ownerEvidence,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          blockerNote: item.blockerNote,
        },
      })
    )
  );
}
