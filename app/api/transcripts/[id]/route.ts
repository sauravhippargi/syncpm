import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface UpdateTranscriptBody {
  title?: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const existing = await prisma.transcript.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Transcript not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  let body: UpdateTranscriptBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  try {
    const transcript = await prisma.transcript.update({
      where: { id },
      data: { title: body.title?.trim() || null },
    });
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("Failed to update transcript", err);
    return NextResponse.json(
      { error: "Failed to update transcript", code: "DB_ERROR" },
      { status: 500 }
    );
  }
}
