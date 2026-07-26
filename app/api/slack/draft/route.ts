import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { draftSlackMessage, GeminiRequestError } from "@/lib/gemini";
import { buildSlackDraftPrompt } from "@/lib/prompts/slack-draft";
import { isBlockerNote } from "@/lib/action-items";

// Vercel Hobby default function timeout is 10s (architecture.md section 5) —
// a single Gemini call plus retries can add up past that.
export const maxDuration = 30;

interface DraftBody {
  actionItemId?: string;
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

  const actionItemId = body.actionItemId;
  if (!actionItemId) {
    return NextResponse.json(
      { error: "actionItemId is required", code: "MISSING_ACTION_ITEM_ID" },
      { status: 400 }
    );
  }

  // action_items have no userId of their own — ownership is inherited
  // through the parent transcript (architecture.md section 4).
  const item = await prisma.actionItem.findFirst({
    where: { id: actionItemId, transcript: { userId: session.user.id } },
  });
  if (!item) {
    return NextResponse.json(
      { error: "Action item not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const owner = item.owner?.trim();
  if (!owner) {
    return NextResponse.json(
      { error: "This item has no owner assigned", code: "MISSING_OWNER" },
      { status: 400 }
    );
  }

  const prompt = buildSlackDraftPrompt({
    description: item.description,
    owner,
    dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : null,
    blockerNote: isBlockerNote(item.blockerNote) ? item.blockerNote : null,
  });

  try {
    const message = await draftSlackMessage(prompt);
    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof GeminiRequestError) {
      console.error("Slack draft generation failed", err);
      return NextResponse.json(
        { error: "Failed to draft the message — try again", code: "GEMINI_REQUEST_FAILED" },
        { status: 502 }
      );
    }
    console.error("Slack draft generation failed", err);
    return NextResponse.json(
      { error: "Failed to draft the message — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
