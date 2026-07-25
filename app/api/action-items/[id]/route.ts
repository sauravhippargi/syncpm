import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface UpdateActionItemBody {
  description?: string;
  owner?: string | null;
  dueDate?: string | null;
  isBlocker?: boolean;
  blockerNote?: string | null;
  status?: string;
  isApproved?: boolean;
}

// action_items have no userId of their own — ownership is inherited through
// their parent transcript (architecture.md section 4), so every read/write
// here must join through transcript.userId to confirm the caller owns it.
async function findOwnedActionItem(id: string, userId: string) {
  return prisma.actionItem.findFirst({
    where: { id, transcript: { userId } },
  });
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

  const existing = await findOwnedActionItem(id, session.user.id);
  if (!existing) {
    return NextResponse.json(
      { error: "Action item not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  let body: UpdateActionItemBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (body.description !== undefined) data.description = body.description;
  if (body.owner !== undefined) data.owner = body.owner;
  if (body.dueDate !== undefined) {
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.isBlocker !== undefined) data.isBlocker = body.isBlocker;
  if (body.blockerNote !== undefined) data.blockerNote = body.blockerNote;
  if (body.status !== undefined) data.status = body.status;
  if (body.isApproved !== undefined) data.isApproved = body.isApproved;

  try {
    const item = await prisma.actionItem.update({ where: { id }, data });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("Failed to update action item", err);
    return NextResponse.json(
      { error: "Failed to update action item", code: "DB_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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

  const existing = await findOwnedActionItem(id, session.user.id);
  if (!existing) {
    return NextResponse.json(
      { error: "Action item not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  try {
    await prisma.actionItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete action item", err);
    return NextResponse.json(
      { error: "Failed to delete action item", code: "DB_ERROR" },
      { status: 500 }
    );
  }
}
