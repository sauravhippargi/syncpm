import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createIssue, JiraRequestError } from "@/lib/jira";

interface SyncBody {
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

  let body: SyncBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  if (!body.actionItemId) {
    return NextResponse.json(
      { error: "actionItemId is required", code: "MISSING_ACTION_ITEM_ID" },
      { status: 400 }
    );
  }

  // action_items have no userId of their own - ownership is inherited
  // through the parent transcript (architecture.md section 4).
  const actionItem = await prisma.actionItem.findFirst({
    where: { id: body.actionItemId, transcript: { userId: session.user.id } },
    include: { transcript: true },
  });

  if (!actionItem) {
    return NextResponse.json(
      { error: "Action item not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (!actionItem.isApproved) {
    return NextResponse.json(
      {
        error: "Approve this item before syncing it to Jira",
        code: "NOT_APPROVED",
      },
      { status: 400 }
    );
  }

  try {
    const { key, url } = await createIssue({
      summary: actionItem.description,
      descriptionText: actionItem.description,
      meetingTitle: actionItem.transcript.title || "Untitled meeting",
      blockerNote: actionItem.isBlocker ? actionItem.blockerNote : null,
      ownerName: actionItem.owner,
      dueDate: actionItem.dueDate,
    });

    await prisma.jiraSyncLog.create({
      data: {
        actionItemId: actionItem.id,
        jiraIssueKey: key,
        jiraUrl: url,
        status: "synced",
      },
    });

    return NextResponse.json({ jiraIssueKey: key, jiraUrl: url });
  } catch (err) {
    // Every attempt (success or failure) is logged in jira_sync_log
    // (rules.md section 2).
    await prisma.jiraSyncLog.create({
      data: {
        actionItemId: actionItem.id,
        jiraIssueKey: null,
        jiraUrl: null,
        status: "failed",
      },
    });

    if (err instanceof JiraRequestError) {
      console.error("Jira sync failed", err.status, err.jiraResponse);
      return NextResponse.json(
        { error: err.message, code: "JIRA_SYNC_FAILED" },
        { status: 502 }
      );
    }

    console.error("Jira sync failed", err);
    return NextResponse.json(
      { error: "Failed to sync to Jira — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
