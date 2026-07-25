import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  ALLOWED_EXTENSIONS,
  MAX_TRANSCRIPT_BYTES,
  isAllowedExtension,
  normalizeTranscript,
  type TranscriptFileType,
} from "@/lib/transcript";

interface CreateTranscriptBody {
  title?: string;
  rawText?: string;
  fileType?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  let body: CreateTranscriptBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const rawText = body.rawText?.trim();
  if (!rawText) {
    return NextResponse.json(
      { error: "Transcript text is required", code: "EMPTY_TRANSCRIPT" },
      { status: 400 }
    );
  }

  if (Buffer.byteLength(rawText, "utf-8") > MAX_TRANSCRIPT_BYTES) {
    return NextResponse.json(
      { error: "Transcript exceeds the 2MB size limit", code: "FILE_TOO_LARGE" },
      { status: 400 }
    );
  }

  let fileType: TranscriptFileType | undefined;
  if (body.fileType) {
    if (!isAllowedExtension(body.fileType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type — use ${ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(", ")}`,
          code: "UNSUPPORTED_FILE_TYPE",
        },
        { status: 400 }
      );
    }
    fileType = body.fileType;
  }

  const normalized = normalizeTranscript(rawText, fileType);

  try {
    const transcript = await prisma.transcript.create({
      data: {
        userId: session.user.id,
        title: body.title?.trim() || null,
        rawText: normalized,
      },
    });
    return NextResponse.json(
      { id: transcript.id, title: transcript.title, uploadedAt: transcript.uploadedAt },
      { status: 201 }
    );
  } catch (err) {
    console.error("Failed to save transcript", err);
    return NextResponse.json(
      { error: "Failed to save transcript", code: "DB_ERROR" },
      { status: 500 }
    );
  }
}
