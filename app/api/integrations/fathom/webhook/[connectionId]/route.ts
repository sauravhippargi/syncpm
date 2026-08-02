import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  fetchMeetingTranscript,
  FathomRequestError,
  verifyWebhookSignature,
} from "@/lib/fathom";
import { isEmptyTranscriptText, normalizeTranscript } from "@/lib/transcript";
import { runExtractionForTranscript } from "@/lib/extraction";

// Same Vercel Hobby timeout consideration as /api/extract (architecture.md
// section 5) — this route also runs the Gemini extraction pass inline.
export const maxDuration = 60;

interface NewMeetingContentPayload {
  recording_id: number;
  title?: string;
  meeting_title?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await params;

  // Signature verification requires the exact raw body bytes — read as text
  // before any JSON parsing (developers.fathom.ai/webhooks).
  const rawBody = await request.text();

  const connection = await prisma.fathomConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) {
    // No connection to verify against, and nothing local to import into —
    // most likely a stale delivery for a connection that's since been
    // disconnected (its webhook should already be deleted on Fathom's side).
    return NextResponse.json(
      { error: "Unknown Fathom connection", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const verified = verifyWebhookSignature(
    connection.webhookSecret,
    {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    },
    rawBody
  );
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid webhook signature", code: "UNVERIFIED" },
      { status: 401 }
    );
  }

  let payload: NewMeetingContentPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook payload", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const meetingId = payload.recording_id;
  if (typeof meetingId !== "number") {
    return NextResponse.json(
      { error: "Webhook payload missing recording_id", code: "MISSING_MEETING_ID" },
      { status: 400 }
    );
  }

  // Idempotency — a webhook can fire more than once for the same meeting
  // (architecture.md section 5); skip silently rather than re-importing.
  const alreadyImported = await prisma.transcript.findFirst({
    where: { userId: connection.userId, fathomMeetingId: meetingId },
  });
  if (alreadyImported) {
    return NextResponse.json({ ok: true, skipped: "already_imported" });
  }

  let rawText: string;
  try {
    rawText = normalizeTranscript(
      await fetchMeetingTranscript(connection.apiKey, meetingId)
    );
  } catch (err) {
    if (err instanceof FathomRequestError) {
      console.error(
        `Failed to fetch Fathom transcript for meeting ${meetingId}`,
        err.status,
        err.fathomResponse
      );
      return NextResponse.json(
        { error: err.message, code: "FATHOM_REQUEST_FAILED" },
        { status: 502 }
      );
    }
    console.error(`Failed to fetch Fathom transcript for meeting ${meetingId}`, err);
    return NextResponse.json(
      { error: "Failed to fetch meeting transcript", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }

  // Before the row and before the Gemini call (rules.md §2). A recording with
  // no captured speech is a successful delivery of nothing — 200 so Fathom
  // doesn't retry it, but no row and no extraction request spent on it.
  if (isEmptyTranscriptText(rawText)) {
    console.warn(
      `Fathom webhook: skipping meeting ${meetingId} — transcript text is empty`
    );
    return NextResponse.json({ ok: true, skipped: "empty_transcript" });
  }

  let transcript;
  try {
    transcript = await prisma.transcript.create({
      data: {
        userId: connection.userId,
        // `title` is Fathom's own displayed meeting name (matches its
        // dashboard); `meeting_title` is just the linked calendar event's
        // title, which is often a generic placeholder like "Impromptu Zoom
        // Meeting" when there's no real calendar event.
        title: payload.title || payload.meeting_title || null,
        rawText,
        source: "fathom",
        fathomMeetingId: meetingId,
      },
    });
  } catch (err) {
    // Two concurrent deliveries for the same meeting can both pass the
    // check above before either commits — the unique constraint on
    // fathom_meeting_id is the real guard; treat that race as a no-op too.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json({ ok: true, skipped: "already_imported" });
    }
    throw err;
  }

  // SyncPM's own extraction stays the source of truth, not Fathom's built-in
  // action items (PRD 6.1a) — feed it through the identical pipeline manual
  // uploads use. The transcript itself already imported successfully, so an
  // extraction failure here still returns 200 rather than making Fathom retry
  // a delivery that was fine (retrying wouldn't fix a Gemini-side issue) — but
  // it's recorded on the row, not just logged (rules.md §2). Nobody is
  // watching a webhook, so an unrecorded failure is one nobody ever learns
  // about.
  try {
    await runExtractionForTranscript(transcript.id, transcript.rawText);
  } catch (err) {
    console.error(
      `Extraction failed for Fathom-imported transcript ${transcript.id}`,
      err
    );
    await prisma.transcript.update({
      where: { id: transcript.id },
      data: { extractionStatus: "failed" },
    });
    return NextResponse.json({ ok: true, extraction: "failed" });
  }

  return NextResponse.json({ ok: true });
}
