import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface CreateActionItemBody {
  transcriptId?: string;
}

// Manual "add missed item" from the Review & Edit screen (PRD 6.3) — creates
// a blank item the PM fills in, or the fallback path when Gemini extraction
// fails validation (rules.md: let the user manually add items instead).
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  let body: CreateActionItemBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  if (!body.transcriptId) {
    return NextResponse.json(
      { error: "transcriptId is required", code: "MISSING_TRANSCRIPT_ID" },
      { status: 400 }
    );
  }

  const transcript = await prisma.transcript.findFirst({
    where: { id: body.transcriptId, userId: session.user.id },
  });
  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  try {
    const item = await prisma.actionItem.create({
      data: {
        transcriptId: body.transcriptId,
        description: "",
        owner: null,
        dueDate: null,
        isBlocker: false,
        blockerNote: null,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error("Failed to create action item", err);
    return NextResponse.json(
      { error: "Failed to create action item", code: "DB_ERROR" },
      { status: 500 }
    );
  }
}
