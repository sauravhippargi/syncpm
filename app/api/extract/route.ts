import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GeminiRequestError, GeminiValidationError } from "@/lib/gemini";
import { runExtractionForTranscript } from "@/lib/extraction";

// Vercel Hobby default function timeout is 10s (architecture.md section 5) —
// extraction on longer transcripts can take longer than that.
export const maxDuration = 60;

interface ExtractBody {
  transcriptId?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  let body: ExtractBody;
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

  const transcript = await prisma.transcript.findFirst({
    where: { id: transcriptId, userId: session.user.id },
  });
  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  try {
    const created = await runExtractionForTranscript(
      transcript.id,
      transcript.rawText
    );

    return NextResponse.json({ items: created }, { status: 200 });
  } catch (err) {
    if (err instanceof GeminiValidationError) {
      // Don't silently coerce malformed output — surface it so the user can
      // add action items manually instead (rules.md section 2).
      return NextResponse.json(
        {
          error: "Extraction returned unexpected output — add action items manually",
          code: "GEMINI_VALIDATION_FAILED",
          rawOutput: err.rawOutput,
        },
        { status: 422 }
      );
    }

    if (err instanceof GeminiRequestError) {
      console.error("Gemini extraction request failed", err);
      return NextResponse.json(
        { error: "Extraction failed — try again", code: "GEMINI_REQUEST_FAILED" },
        { status: 502 }
      );
    }

    console.error("Extraction failed", err);
    return NextResponse.json(
      { error: "Extraction failed — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
