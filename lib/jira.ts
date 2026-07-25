import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

const ATLASSIAN_AUTH_URL = "https://auth.atlassian.com";
const ATLASSIAN_API_URL = "https://api.atlassian.com";
const JIRA_ISSUE_TYPE = "Task";

// Classic Jira OAuth 2.0 (3LO) scopes — offline_access is required to get a
// refresh_token back at all, otherwise Atlassian only issues a short-lived
// access_token with no way to renew it.
export const JIRA_OAUTH_SCOPES =
  "read:jira-work write:jira-work read:jira-user offline_access";

// Thrown on any failure to create a Jira issue or call the Jira API - carries
// the raw response so the caller can surface the actual error message per
// rules.md section 2 ("failures should surface the actual Jira error message").
export class JiraRequestError extends Error {
  status?: number;
  jiraResponse?: unknown;

  constructor(message: string, status?: number, jiraResponse?: unknown) {
    super(message);
    this.status = status;
    this.jiraResponse = jiraResponse;
  }
}

// Thrown when the signed-in user has no jira_connections row yet.
export class JiraNotConnectedError extends Error {
  constructor() {
    super("Jira is not connected for this account");
  }
}

// Thrown when the stored refresh token was rejected (e.g. the user revoked
// access from Atlassian's side). The connection row is deleted as part of
// throwing this - rules.md section 2: "delete the jira_connections row and
// show a clear 'Your Jira connection expired — reconnect' message".
export class JiraConnectionExpiredError extends Error {
  constructor() {
    super("Your Jira connection expired — reconnect");
  }
}

function getOAuthAppConfig() {
  const clientId = process.env.JIRA_OAUTH_CLIENT_ID;
  const clientSecret = process.env.JIRA_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new JiraRequestError(
      "Jira OAuth is not configured — missing JIRA_OAUTH_CLIENT_ID or JIRA_OAUTH_CLIENT_SECRET"
    );
  }
  return { clientId, clientSecret };
}

// The `state` param round-trips through Atlassian's consent screen unchanged,
// so it doubles as the transport for the actionItemId that started a connect
// flow from inside RaiseATicketModal (architecture.md section 5, "OAuth
// return context") — encoded alongside a CSRF token so the callback can still
// verify the request came from the flow we started (the encoded string is
// what's stored in the state cookie and compared for equality).
export function encodeOAuthState(actionItemId?: string | null): string {
  const payload = { csrf: randomUUID(), actionItemId: actionItemId ?? null };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeOAuthState(
  state: string
): { actionItemId: string | null } | null {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (typeof parsed?.csrf !== "string") return null;
    return {
      actionItemId:
        typeof parsed.actionItemId === "string" ? parsed.actionItemId : null,
    };
  } catch {
    return null;
  }
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const { clientId } = getOAuthAppConfig();
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: clientId,
    scope: JIRA_OAUTH_SCOPES,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    prompt: "consent",
  });
  return `${ATLASSIAN_AUTH_URL}/authorize?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const { clientId, clientSecret } = getOAuthAppConfig();

  const res = await fetch(`${ATLASSIAN_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new JiraRequestError(
      `Failed to exchange Jira authorization code: ${JSON.stringify(body)}`,
      res.status,
      body
    );
  }
  return body as TokenResponse;
}

export interface AccessibleResource {
  id: string; // cloudId
  url: string;
  name: string;
}

export async function getAccessibleResources(
  accessToken: string
): Promise<AccessibleResource[]> {
  const res = await fetch(`${ATLASSIAN_API_URL}/oauth/token/accessible-resources`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new JiraRequestError(
      "Failed to fetch accessible Jira sites",
      res.status,
      body
    );
  }
  return body as AccessibleResource[];
}

async function refreshAccessToken(userId: string, refreshToken: string) {
  const { clientId, clientSecret } = getOAuthAppConfig();

  const res = await fetch(`${ATLASSIAN_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    // The refresh token was rejected - the connection is no longer usable.
    await prisma.jiraConnection.deleteMany({ where: { userId } });
    throw new JiraConnectionExpiredError();
  }

  const body = (await res.json()) as TokenResponse;

  // Atlassian rotates the refresh token on every use - the old one is
  // invalidated, so it must be overwritten, never reused (architecture.md
  // section 5).
  return prisma.jiraConnection.update({
    where: { userId },
    data: {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: new Date(Date.now() + body.expires_in * 1000),
    },
  });
}

// Refreshes 60s early so a token that's valid at lookup time doesn't expire
// mid-request.
const EXPIRY_BUFFER_MS = 60_000;

async function getValidConnection(userId: string) {
  const connection = await prisma.jiraConnection.findUnique({
    where: { userId },
  });
  if (!connection) {
    throw new JiraNotConnectedError();
  }

  if (connection.expiresAt.getTime() - EXPIRY_BUFFER_MS <= Date.now()) {
    return refreshAccessToken(userId, connection.refreshToken);
  }

  return connection;
}

export interface JiraProject {
  key: string;
  name: string;
}

export async function listAccessibleProjects(
  userId: string
): Promise<JiraProject[]> {
  const connection = await getValidConnection(userId);

  const res = await fetch(
    `${ATLASSIAN_API_URL}/ex/jira/${connection.cloudId}/rest/api/3/project/search`,
    {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: "application/json",
      },
    }
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new JiraRequestError(
      "Failed to fetch Jira projects",
      res.status,
      body
    );
  }

  const values = (body as { values?: { key: string; name: string }[] })?.values ?? [];
  return values.map((p) => ({ key: p.key, name: p.name }));
}

export interface AssignableUser {
  accountId: string;
  displayName: string;
}

// GET /rest/api/3/user/assignable/search returns a bare array (unlike
// project/search, which wraps results in { values: [...] }).
export async function getAssignableUsers(
  userId: string,
  projectKey: string
): Promise<AssignableUser[]> {
  const connection = await getValidConnection(userId);

  const params = new URLSearchParams({ project: projectKey, maxResults: "50" });
  const res = await fetch(
    `${ATLASSIAN_API_URL}/ex/jira/${connection.cloudId}/rest/api/3/user/assignable/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: "application/json",
      },
    }
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new JiraRequestError(
      "Failed to fetch assignable Jira users",
      res.status,
      body
    );
  }

  const values = Array.isArray(body) ? body : [];
  return values.map((u: { accountId: string; displayName: string }) => ({
    accountId: u.accountId,
    displayName: u.displayName,
  }));
}

// Jira Cloud REST API v3 requires `description` to be Atlassian Document
// Format - a nested doc/paragraph/text structure - not a plain string.
// Sending a plain string here returns a 400 ("must be an ADF document").
function toADF(paragraphs: string[]) {
  return {
    type: "doc",
    version: 1,
    content: paragraphs
      .filter((p) => p.trim().length > 0)
      .map((p) => ({
        type: "paragraph",
        content: [{ type: "text", text: p }],
      })),
  };
}

function extractJiraErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const b = body as { errorMessages?: string[]; errors?: Record<string, string> };
    const parts: string[] = [];
    if (Array.isArray(b.errorMessages) && b.errorMessages.length > 0) {
      parts.push(...b.errorMessages);
    }
    if (b.errors && typeof b.errors === "object") {
      parts.push(
        ...Object.entries(b.errors).map(([field, msg]) => `${field}: ${msg}`)
      );
    }
    if (parts.length > 0) return parts.join("; ");
  }
  return `Jira request failed (${status})`;
}

export interface CreateIssueInput {
  summary: string;
  descriptionText: string;
  meetingTitle: string;
  blockerNote?: string | null;
  ownerName?: string | null;
  dueDate?: Date | null;
  assigneeAccountId?: string | null;
  priority?: string | null;
  // Falls back to the connection's stored default project when omitted —
  // RaiseATicketModal always passes the project currently selected there,
  // which isn't necessarily that default (PRD 6.4).
  projectKey?: string | null;
}

export interface CreateIssueResult {
  key: string;
  url: string;
}

// Assignee is set by accountId (Jira's internal identifier, resolved via
// getAssignableUsers) and priority by name — chosen in RaiseATicketModal,
// pre-filled but always overridable there (PRD 6.4).
export async function createIssue(
  userId: string,
  input: CreateIssueInput
): Promise<CreateIssueResult> {
  const connection = await getValidConnection(userId);

  const projectKey = input.projectKey || connection.projectKey;
  if (!projectKey) {
    throw new JiraRequestError(
      "No Jira project selected — choose one in the ticket modal"
    );
  }

  const paragraphs = [input.descriptionText];
  if (input.blockerNote) {
    paragraphs.push(`Blocker: ${input.blockerNote}`);
  }
  if (input.ownerName) {
    paragraphs.push(`Owner: ${input.ownerName}`);
  }
  paragraphs.push(`From meeting: ${input.meetingTitle}`);

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    summary: input.summary.slice(0, 255),
    issuetype: { name: JIRA_ISSUE_TYPE },
    description: toADF(paragraphs),
  };

  if (input.dueDate) {
    fields.duedate = input.dueDate.toISOString().slice(0, 10);
  }

  if (input.assigneeAccountId) {
    fields.assignee = { accountId: input.assigneeAccountId };
  }

  if (input.priority) {
    fields.priority = { name: input.priority };
  }

  let response: Response;
  try {
    response = await fetch(
      `${ATLASSIAN_API_URL}/ex/jira/${connection.cloudId}/rest/api/3/issue`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ fields }),
      }
    );
  } catch (err) {
    throw new JiraRequestError(
      `Could not reach Jira: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new JiraRequestError(
      extractJiraErrorMessage(response.status, body),
      response.status,
      body
    );
  }

  const key = body?.key;
  if (typeof key !== "string") {
    throw new JiraRequestError(
      "Jira response did not include an issue key",
      response.status,
      body
    );
  }

  return { key, url: `${connection.siteUrl}/browse/${key}` };
}
