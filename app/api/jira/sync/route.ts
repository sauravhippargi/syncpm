import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createIssue,
  JiraConnectionExpiredError,
  JiraNotConnectedError,
  JiraRequestError,
} from "@/lib/jira";

interface SyncBody {
  actionItemId?: string;
  assigneeAccountId?: string | null;
  priority?: string;
  projectKey?: string;
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

  const assigneeAccountId = body.assigneeAccountId || null;
  const priority = body.priority || null;
  const projectKey = body.projectKey || null;

  try {
    const { key, url } = await createIssue(session.user.id, {
      summary: actionItem.description,
      descriptionText: actionItem.description,
      meetingTitle: actionItem.transcript.title || "Untitled meeting",
      blockerNote: actionItem.blockerNote,
      ownerName: actionItem.owner,
      dueDate: actionItem.dueDate,
      assigneeAccountId,
      priority,
      projectKey,
    });

    await prisma.jiraSyncLog.create({
      data: {
        actionItemId: actionItem.id,
        jiraIssueKey: key,
        jiraUrl: url,
        jiraProjectKey: projectKey,
        assigneeAccountId,
        priority,
        status: "synced",
      },
    });

    return NextResponse.json({ jiraIssueKey: key, jiraUrl: url });
  } catch (err) {
    // Not connected at all - no Jira request was ever attempted, so route
    // the client back to the Tickets tab rather than logging a
    // failed sync (rules.md section 2).
    if (err instanceof JiraNotConnectedError) {
      return NextResponse.json(
        {
          error: "Jira is not connected — connect it on the Tickets tab",
          code: "NOT_CONNECTED",
        },
        { status: 400 }
      );
    }

    // Every attempted sync (success or failure) is logged in jira_sync_log
    // (rules.md section 2).
    await prisma.jiraSyncLog.create({
      data: {
        actionItemId: actionItem.id,
        jiraIssueKey: null,
        jiraUrl: null,
        jiraProjectKey: projectKey,
        assigneeAccountId,
        priority,
        status: "failed",
      },
    });

    if (err instanceof JiraConnectionExpiredError) {
      return NextResponse.json(
        { error: err.message, code: "CONNECTION_EXPIRED" },
        { status: 401 }
      );
    }

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
