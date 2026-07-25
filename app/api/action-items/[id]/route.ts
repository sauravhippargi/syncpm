import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface UpdateActionItemBody {
  description?: string;
  owner?: string | null;
  dueDate?: string | null;
  isBlocker?: boolean;
  blockerNote?: string | null;
  status?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
  const { id } = await params;

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
