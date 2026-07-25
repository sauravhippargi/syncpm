import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address", code: "INVALID_EMAIL" },
      { status: 400 }
    );
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      {
        error: "Password must be at least 8 characters",
        code: "INVALID_PASSWORD",
      },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      {
        error: "An account with this email already exists",
        code: "EMAIL_TAKEN",
      },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { email, hashedPassword },
    });
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "An account with this email already exists",
          code: "EMAIL_TAKEN",
        },
        { status: 409 }
      );
    }
    console.error("Failed to create account", err);
    return NextResponse.json(
      { error: "Failed to create account", code: "DB_ERROR" },
      { status: 500 }
    );
  }
}
