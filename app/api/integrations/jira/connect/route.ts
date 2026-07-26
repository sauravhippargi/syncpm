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
  // Must exactly match a redirect URL registered in the Atlassian Developer
  // Console, so this has to be the app's real public origin — never derived
  // from the incoming request (new URL(request.url).origin), which reflects
  // however the request actually arrived (direct, behind a tunnel, behind a
  // proxy) and proved unreliable for that reason (same issue as the Fathom
  // webhook callback URL).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (!appUrl) {
    console.error("NEXT_PUBLIC_APP_URL is not configured");
    return NextResponse.json(
      { error: "Server misconfiguration — app URL is not set", code: "MISSING_APP_URL" },
      { status: 500 }
    );
  }
  const redirectUri = `${appUrl}/api/integrations/jira/callback`;
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
