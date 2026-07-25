import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  JiraConnectionExpiredError,
  JiraNotConnectedError,
  JiraRequestError,
  listAccessibleProjects,
} from "@/lib/jira";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  try {
    const projects = await listAccessibleProjects(session.user.id);
    return NextResponse.json({ projects });
  } catch (err) {
    if (err instanceof JiraNotConnectedError) {
      return NextResponse.json(
        { error: err.message, code: "NOT_CONNECTED" },
        { status: 400 }
      );
    }
    if (err instanceof JiraConnectionExpiredError) {
      return NextResponse.json(
        { error: err.message, code: "CONNECTION_EXPIRED" },
        { status: 401 }
      );
    }
    if (err instanceof JiraRequestError) {
      console.error("Failed to list Jira projects", err.status, err.jiraResponse);
      return NextResponse.json(
        { error: err.message, code: "JIRA_REQUEST_FAILED" },
        { status: 502 }
      );
    }
    console.error("Failed to list Jira projects", err);
    return NextResponse.json(
      { error: "Failed to load Jira projects — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

interface SelectProjectBody {
  projectKey?: string;
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  let body: SelectProjectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  if (!body.projectKey) {
    return NextResponse.json(
      { error: "projectKey is required", code: "MISSING_PROJECT_KEY" },
      { status: 400 }
    );
  }

  const connection = await prisma.jiraConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    return NextResponse.json(
      { error: "Jira is not connected for this account", code: "NOT_CONNECTED" },
      { status: 400 }
    );
  }

  await prisma.jiraConnection.update({
    where: { userId: session.user.id },
    data: { projectKey: body.projectKey },
  });

  return NextResponse.json({ projectKey: body.projectKey });
}
