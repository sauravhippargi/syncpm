import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  decodeOAuthState,
  exchangeCodeForTokens,
  getAccessibleResources,
} from "@/lib/jira";

const STATE_COOKIE = "jira_oauth_state";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const storedState = request.cookies.get(STATE_COOKIE)?.value;

  const failureUrl = (reason: string) =>
    new URL(`/raise-a-ticket?jira_error=${encodeURIComponent(reason)}`, request.url);

  if (oauthError) {
    return NextResponse.redirect(failureUrl(oauthError));
  }

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(failureUrl("state_mismatch"));
  }

  const redirectUri = `${new URL(request.url).origin}/api/integrations/jira/callback`;

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const resources = await getAccessibleResources(tokens.access_token);

    const site = resources[0];
    if (!site) {
      return NextResponse.redirect(failureUrl("no_accessible_site"));
    }

    await prisma.jiraConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        cloudId: site.id,
        siteUrl: site.url,
        siteName: site.name,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        cloudId: site.id,
        siteUrl: site.url,
        siteName: site.name,
      },
    });

    // If connect was initiated from RaiseATicketModal, return to that same
    // action item's Review & Edit screen with the modal reopened, rather
    // than the standalone Raise a ticket tab (architecture.md section 5).
    const actionItemId = decodeOAuthState(state)?.actionItemId ?? null;
    const actionItem = actionItemId
      ? await prisma.actionItem.findFirst({
          where: { id: actionItemId, transcript: { userId: session.user.id } },
          select: { transcriptId: true },
        })
      : null;

    const successUrl = actionItem
      ? new URL(
          `/review/${actionItem.transcriptId}?openTicketModal=${actionItemId}`,
          request.url
        )
      : new URL("/raise-a-ticket", request.url);

    const response = NextResponse.redirect(successUrl);
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("Jira OAuth callback failed", err);
    return NextResponse.redirect(failureUrl("token_exchange_failed"));
  }
}
