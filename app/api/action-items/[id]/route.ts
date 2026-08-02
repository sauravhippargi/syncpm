import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface UpdateActionItemBody {
  description?: string;
  owner?: string | null;
  dueDate?: string | null;
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
  if (body.owner !== undefined) {
    data.owner = body.owner;
    // A quote only ever justifies the owner extraction itself produced. The
    // moment a reviewer picks a different name — or clears the field — the
    // citation no longer supports what's stored, so it's dropped (prd.md
    // 6.2a). An owner PATCHed to its existing value (e.g. Review & Edit's
    // Save, which sends every field of every checked item) isn't a change and
    // keeps its quote.
    //
    // DELIBERATELY RETAINED, not dead code. owner_evidence has no read path in
    // the app — Owner Evidence is non-visual (prd.md 6.2a), so this branch's
    // effect is observable only by querying the table directly. It stays
    // because it keeps the stored invariant true: no row ever carries a quote
    // paired with a human-chosen owner. Anything that reads the column later —
    // a re-surfaced UI, an export, an audit query — inherits honest data
    // instead of silently wrong data with no signal it happened. Losing a
    // quote is the safe direction to fail; see evals/KNOWN-ISSUES.md section 3
    // for the accepted cost.
    const nextOwner = body.owner?.trim() || null;
    const currentOwner = existing.owner?.trim() || null;
    if (nextOwner !== currentOwner) data.ownerEvidence = null;
  }
  if (body.dueDate !== undefined) {
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
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
