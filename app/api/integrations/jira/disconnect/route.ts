import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await prisma.jiraConnection.deleteMany({ where: { userId: session.user.id } });

  return NextResponse.redirect(new URL("/raise-a-ticket", request.url));
}
