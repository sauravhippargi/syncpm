import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { draftSlackMessage, GeminiRequestError } from "@/lib/gemini";
import { buildSlackDraftPrompt } from "@/lib/prompts/slack-draft";
import { isBlockerNote } from "@/lib/action-items";

// Vercel Hobby default function timeout is 10s (architecture.md section 5) —
// one Gemini call per owner can add up past that on transcripts with
// several distinct owners.
export const maxDuration = 60;

interface DraftBody {
  transcriptId?: string;
}

export interface SlackDraftResult {
  owner: string | null;
  message: string | null;
  items: { id: string; description: string }[];
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  let body: DraftBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const transcriptId = body.transcriptId;
  if (!transcriptId) {
    return NextResponse.json(
      { error: "transcriptId is required", code: "MISSING_TRANSCRIPT_ID" },
      { status: 400 }
    );
  }

  // action_items have no userId of their own — ownership is inherited
  // through the parent transcript (architecture.md section 4).
  const transcript = await prisma.transcript.findFirst({
    where: { id: transcriptId, userId: session.user.id },
    include: {
      actionItems: { where: { isApproved: true }, orderBy: { id: "asc" } },
    },
  });
  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const meetingTitle = transcript.title || "Untitled meeting";

  // Group approved items by owner — items with no owner assigned skip
  // Gemini entirely and surface as a separate "needs an owner" group instead
  // of a drafted message.
  const withOwner = new Map<string, typeof transcript.actionItems>();
  const unassigned: typeof transcript.actionItems = [];

  for (const item of transcript.actionItems) {
    const owner = item.owner?.trim();
    if (owner) {
      const list = withOwner.get(owner) ?? [];
      list.push(item);
      withOwner.set(owner, list);
    } else {
      unassigned.push(item);
    }
  }

  const results: SlackDraftResult[] = [];

  try {
    for (const [owner, items] of withOwner) {
      const prompt = buildSlackDraftPrompt(
        owner,
        meetingTitle,
        items.map((item) => ({
          description: item.description,
          dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : null,
          blockerNote: isBlockerNote(item.blockerNote) ? item.blockerNote : null,
        }))
      );
      const message = await draftSlackMessage(prompt);
      results.push({
        owner,
        message,
        items: items.map((item) => ({ id: item.id, description: item.description })),
      });
    }
  } catch (err) {
    if (err instanceof GeminiRequestError) {
      console.error("Slack draft generation failed", err);
      return NextResponse.json(
        { error: "Failed to draft Slack messages — try again", code: "GEMINI_REQUEST_FAILED" },
        { status: 502 }
      );
    }
    console.error("Slack draft generation failed", err);
    return NextResponse.json(
      { error: "Failed to draft Slack messages — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }

  if (unassigned.length > 0) {
    results.push({
      owner: null,
      message: null,
      items: unassigned.map((item) => ({ id: item.id, description: item.description })),
    });
  }

  return NextResponse.json({ drafts: results });
}
