import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  FathomRequestError,
  registerWebhook,
  validateApiKey,
} from "@/lib/fathom";

interface ConnectBody {
  apiKey?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // Fathom needs a callback URL it can reach from the outside, so this must
  // be the app's real public origin — never derived from the incoming
  // request (new URL(request.url).origin), which reflects however the
  // request actually arrived (direct, behind a tunnel, behind a proxy) and
  // proved unreliable for that reason.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (!appUrl) {
    console.error("NEXT_PUBLIC_APP_URL is not configured");
    return NextResponse.json(
      { error: "Server misconfiguration — app URL is not set", code: "MISSING_APP_URL" },
      { status: 500 }
    );
  }

  let body: ConnectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const apiKey = body.apiKey?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Paste your Fathom API key", code: "MISSING_API_KEY" },
      { status: 400 }
    );
  }

  const existing = await prisma.fathomConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "Fathom is already connected for this account",
        code: "ALREADY_CONNECTED",
      },
      { status: 400 }
    );
  }

  try {
    const valid = await validateApiKey(apiKey);
    if (!valid) {
      return NextResponse.json(
        { error: "That Fathom API key isn't valid", code: "INVALID_API_KEY" },
        { status: 400 }
      );
    }
  } catch (err) {
    if (err instanceof FathomRequestError) {
      console.error("Fathom API key validation failed", err.status, err.fathomResponse);
      return NextResponse.json(
        { error: err.message, code: "FATHOM_REQUEST_FAILED" },
        { status: 502 }
      );
    }
    console.error("Fathom API key validation failed", err);
    return NextResponse.json(
      { error: "Failed to validate Fathom API key — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }

  // The webhook callback URL must include this connection's own id
  // (architecture.md section 5, "Fathom webhook endpoint is multi-tenant"),
  // so the row is created first with placeholder webhook fields, then
  // updated once Fathom's response gives us the real webhook id + secret.
  const connection = await prisma.fathomConnection.create({
    data: {
      userId: session.user.id,
      apiKey,
      webhookSecret: "",
      fathomWebhookId: "",
    },
  });

  const callbackUrl = `${appUrl}/api/integrations/fathom/webhook/${connection.id}`;

  try {
    const webhook = await registerWebhook(apiKey, callbackUrl);
    await prisma.fathomConnection.update({
      where: { id: connection.id },
      data: { fathomWebhookId: webhook.id, webhookSecret: webhook.secret },
    });
    return NextResponse.json({ connected: true });
  } catch (err) {
    // Roll back the placeholder row rather than leaving a half-connected,
    // webhook-less row behind.
    await prisma.fathomConnection.delete({ where: { id: connection.id } });

    if (err instanceof FathomRequestError) {
      console.error("Fathom webhook registration failed", err.status, err.fathomResponse);
      return NextResponse.json(
        { error: err.message, code: "FATHOM_REQUEST_FAILED" },
        { status: 502 }
      );
    }
    console.error("Fathom webhook registration failed", err);
    return NextResponse.json(
      { error: "Failed to register Fathom webhook — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
