import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteWebhook, FathomRequestError } from "@/lib/fathom";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const connection = await prisma.fathomConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    return NextResponse.json({ disconnected: true });
  }

  // Delete the webhook on Fathom's side first (architecture.md section 5) so
  // events stop arriving — but don't let a failure there strand the user
  // with a local connection they can't remove; log and still delete the row.
  try {
    await deleteWebhook(connection.apiKey, connection.fathomWebhookId);
  } catch (err) {
    if (err instanceof FathomRequestError) {
      console.error(
        "Failed to delete Fathom webhook during disconnect",
        err.status,
        err.fathomResponse
      );
    } else {
      console.error("Failed to delete Fathom webhook during disconnect", err);
    }
  }

  await prisma.fathomConnection.delete({ where: { id: connection.id } });

  return NextResponse.json({ disconnected: true });
}
