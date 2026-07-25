import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildAuthorizeUrl, encodeOAuthState } from "@/lib/jira";

const STATE_COOKIE = "jira_oauth_state";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Present when connect was initiated from inside RaiseATicketModal, so the
  // callback can send the user back to that same action item instead of the
  // standalone Tickets tab.
  const actionItemId = request.nextUrl.searchParams.get("actionItemId");
  const state = encodeOAuthState(actionItemId);
  const redirectUri = `${new URL(request.url).origin}/api/integrations/jira/callback`;
  const authorizeUrl = buildAuthorizeUrl(redirectUri, state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
