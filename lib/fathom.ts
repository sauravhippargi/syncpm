import { createHmac, timingSafeEqual } from "crypto";

// Confirmed directly against developers.fathom.ai at implementation time
// (architecture.md section 5) — base URL and auth header, not guessed.
const FATHOM_API_BASE = "https://api.fathom.ai/external/v1";

// Thrown on any failure calling the Fathom API — carries the raw response so
// callers can surface the actual error message, matching lib/jira.ts's
// JiraRequestError convention.
export class FathomRequestError extends Error {
  status?: number;
  fathomResponse?: unknown;

  constructor(message: string, status?: number, fathomResponse?: unknown) {
    super(message);
    this.status = status;
    this.fathomResponse = fathomResponse;
  }
}

async function fathomFetch(
  apiKey: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${FATHOM_API_BASE}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": apiKey,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

// Lightweight test call to confirm a pasted key is valid before storing it
// (PRD 6.1a) — GET /meetings takes no required parameters, so it doubles as
// a cheap auth check.
export async function validateApiKey(apiKey: string): Promise<boolean> {
  const res = await fathomFetch(apiKey, "/meetings");
  if (res.ok) return true;
  if (res.status === 401 || res.status === 403) return false;

  const body = await res.json().catch(() => null);
  throw new FathomRequestError(
    `Failed to validate Fathom API key (${res.status})`,
    res.status,
    body
  );
}

export interface RegisteredWebhook {
  id: string;
  secret: string;
}

// Registers a webhook requesting transcript, summary, and action-item data
// for every new meeting the connecting user records (PRD 6.1a). Scoped to
// the user's own recordings (`my_recordings`) — this is a personal, one-user
// connection, not team-wide sharing.
export async function registerWebhook(
  apiKey: string,
  callbackUrl: string
): Promise<RegisteredWebhook> {
  const res = await fathomFetch(apiKey, "/webhooks", {
    method: "POST",
    body: JSON.stringify({
      destination_url: callbackUrl,
      triggered_for: ["my_recordings"],
      include_transcript: true,
      include_summary: true,
      include_action_items: true,
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new FathomRequestError(
      "Failed to register Fathom webhook",
      res.status,
      body
    );
  }

  const id = body?.id;
  const secret = body?.secret;
  if (typeof id !== "string" || typeof secret !== "string") {
    throw new FathomRequestError(
      "Fathom webhook response did not include an id and secret",
      res.status,
      body
    );
  }

  return { id, secret };
}

// For disconnect — a 404 here means the webhook is already gone on Fathom's
// side (e.g. removed manually), which is fine to treat as success rather
// than blocking the user from clearing their local connection.
export async function deleteWebhook(
  apiKey: string,
  webhookId: string
): Promise<void> {
  const res = await fathomFetch(
    apiKey,
    `/webhooks/${encodeURIComponent(webhookId)}`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 404) {
    const body = await res.json().catch(() => null);
    throw new FathomRequestError(
      "Failed to delete Fathom webhook",
      res.status,
      body
    );
  }
}

export interface FathomMeetingSummary {
  recordingId: number;
  title: string | null;
  meetingTitle: string | null;
}

// Safety cap on pagination — a personal account's recent-meetings window is
// small in practice; this just guards against an unexpected runaway loop.
const MAX_LIST_PAGES = 20;

// Lists meetings created on/after `createdAfter`, paginating through every
// page via `cursor` (PRD 6.7 — manual "Sync recent Fathom meetings" backfill,
// covering meetings recorded before a connection existed or a webhook
// delivery that failed).
export async function listRecentMeetings(
  apiKey: string,
  createdAfter: Date
): Promise<FathomMeetingSummary[]> {
  const meetings: FathomMeetingSummary[] = [];
  let cursor: string | null = null;
  let page = 0;

  do {
    const params = new URLSearchParams({
      created_after: createdAfter.toISOString(),
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fathomFetch(apiKey, `/meetings?${params.toString()}`);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new FathomRequestError(
        "Failed to list Fathom meetings",
        res.status,
        body
      );
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    for (const item of items) {
      if (typeof item?.recording_id === "number") {
        meetings.push({
          recordingId: item.recording_id,
          title: typeof item.title === "string" ? item.title : null,
          meetingTitle:
            typeof item.meeting_title === "string" ? item.meeting_title : null,
        });
      }
    }

    cursor = typeof body?.next_cursor === "string" ? body.next_cursor : null;
    page++;
  } while (cursor && page < MAX_LIST_PAGES);

  return meetings;
}

interface FathomTranscriptLine {
  speaker?: { display_name?: string };
  text: string;
}

// Pulls the transcript for a specific completed meeting and flattens it into
// plain "Speaker: text" lines, ready to feed into the same normalization +
// Gemini extraction pipeline manual uploads use (PRD 6.1/6.1a).
export async function fetchMeetingTranscript(
  apiKey: string,
  meetingId: number
): Promise<string> {
  const res = await fathomFetch(apiKey, `/recordings/${meetingId}/transcript`);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new FathomRequestError(
      "Failed to fetch Fathom meeting transcript",
      res.status,
      body
    );
  }

  const lines: FathomTranscriptLine[] = Array.isArray(body?.transcript)
    ? body.transcript
    : [];
  return lines
    .map((line) => `${line.speaker?.display_name || "Unknown speaker"}: ${line.text}`)
    .join("\n");
}

export interface FathomWebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

// Reject requests with a timestamp older/newer than this to prevent replay
// (developers.fathom.ai/webhooks — "typically 5 minutes").
const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300;

// Verifies an incoming webhook is authentically from Fathom before any
// processing, per developers.fathom.ai's documented scheme (webhooks page,
// "How to verify a webhook" — Method 2, no SDK):
//   1. signed content is `${webhook-id}.${webhook-timestamp}.${rawBody}`
//   2. the webhook secret's `whsec_` prefix is stripped, the rest is base64
//      decoded to get the raw HMAC key
//   3. HMAC-SHA256 the signed content with that key, base64-encode the result
//   4. compare against each space-delimited "v1,<base64>" signature in the
//      webhook-signature header (stripping the version prefix) using a
//      constant-time comparison
export function verifyWebhookSignature(
  webhookSecret: string,
  headers: FathomWebhookHeaders,
  rawBody: string
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;

  const timestamp = Number.parseInt(headers.timestamp, 10);
  if (!Number.isFinite(timestamp)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    return false;
  }

  const secretBase64 = webhookSecret.startsWith("whsec_")
    ? webhookSecret.slice("whsec_".length)
    : webhookSecret;
  const secretBytes = Buffer.from(secretBase64, "base64");

  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expectedSignature = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  const expectedBuffer = Buffer.from(expectedSignature);

  const providedSignatures = headers.signature.split(" ").map((part) => {
    const commaIndex = part.indexOf(",");
    return commaIndex === -1 ? part : part.slice(commaIndex + 1);
  });

  return providedSignatures.some((sig) => {
    const sigBuffer = Buffer.from(sig);
    // timingSafeEqual throws on mismatched lengths rather than returning
    // false — guard first so a malformed signature can't crash the route.
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, sigBuffer);
  });
}
