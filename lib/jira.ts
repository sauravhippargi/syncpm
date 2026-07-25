const JIRA_ISSUE_TYPE = "Task";

// Thrown on any failure to create a Jira issue - request error, auth error,
// or a validation error from Jira itself. Carries the raw Jira response so
// the caller can surface the actual error message per rules.md section 2
// ("failures should surface the actual Jira error message in the UI").
export class JiraRequestError extends Error {
  status?: number;
  jiraResponse?: unknown;

  constructor(message: string, status?: number, jiraResponse?: unknown) {
    super(message);
    this.status = status;
    this.jiraResponse = jiraResponse;
  }
}

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

function getJiraConfig(): JiraConfig {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!baseUrl || !email || !apiToken || !projectKey) {
    throw new JiraRequestError(
      "Jira is not configured — missing JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, or JIRA_PROJECT_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), email, apiToken, projectKey };
}

function authHeaders(email: string, apiToken: string): HeadersInit {
  const token = Buffer.from(`${email}:${apiToken}`).toString("base64");
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
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

// Best-effort assignee lookup by the extracted owner name. Gemini extracts
// free-text names from the transcript, not Jira account IDs, so this is
// necessarily fuzzy - if there isn't exactly one match, the issue is
// created unassigned rather than failing the whole sync (PRD 6.4 lists
// assignee as "if known", same as due date).
async function findAssigneeAccountId(
  baseUrl: string,
  headers: HeadersInit,
  name: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${baseUrl}/rest/api/3/user/search?query=${encodeURIComponent(name)}`,
      { headers }
    );
    if (!res.ok) return null;
    const users = await res.json();
    if (Array.isArray(users) && users.length === 1 && users[0]?.accountId) {
      return users[0].accountId as string;
    }
    return null;
  } catch {
    return null;
  }
}

export interface CreateIssueInput {
  summary: string;
  descriptionText: string;
  meetingTitle: string;
  blockerNote?: string | null;
  ownerName?: string | null;
  dueDate?: Date | null;
}

export interface CreateIssueResult {
  key: string;
  url: string;
}

export async function createIssue(
  input: CreateIssueInput
): Promise<CreateIssueResult> {
  const { baseUrl, email, apiToken, projectKey } = getJiraConfig();
  const headers = authHeaders(email, apiToken);

  const paragraphs = [input.descriptionText];
  if (input.blockerNote) {
    paragraphs.push(`Blocker: ${input.blockerNote}`);
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

  if (input.ownerName) {
    const accountId = await findAssigneeAccountId(
      baseUrl,
      headers,
      input.ownerName
    );
    if (accountId) {
      fields.assignee = { accountId };
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields }),
    });
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

  return { key, url: `${baseUrl}/browse/${key}` };
}
