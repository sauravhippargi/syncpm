import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getAssignableUsers,
  JiraConnectionExpiredError,
  JiraNotConnectedError,
  JiraRequestError,
} from "@/lib/jira";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
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
  if (!connection.projectKey) {
    return NextResponse.json(
      {
        error: "No default Jira project selected — choose one on the Raise a ticket tab",
        code: "NO_PROJECT",
      },
      { status: 400 }
    );
  }

  try {
    const users = await getAssignableUsers(session.user.id, connection.projectKey);
    return NextResponse.json({ users });
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
      console.error("Failed to list assignable Jira users", err.status, err.jiraResponse);
      return NextResponse.json(
        { error: err.message, code: "JIRA_REQUEST_FAILED" },
        { status: 502 }
      );
    }
    console.error("Failed to list assignable Jira users", err);
    return NextResponse.json(
      { error: "Failed to load assignable users — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
