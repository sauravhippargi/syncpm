import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  try {
    await prisma.jiraConnection.deleteMany({ where: { userId: session.user.id } });
    return NextResponse.json({ disconnected: true });
  } catch (err) {
    console.error("Failed to disconnect Jira", err);
    return NextResponse.json(
      { error: "Failed to disconnect Jira — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
