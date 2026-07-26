import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fetchMeetingTranscript,
  FathomRequestError,
  listRecentMeetings,
} from "@/lib/fathom";
import { normalizeTranscript } from "@/lib/transcript";
import { runExtractionForTranscript } from "@/lib/extraction";

// Same Vercel Hobby timeout consideration as /api/extract and the Fathom
// webhook route — this can run extraction for several meetings inline.
export const maxDuration = 60;

const BACKFILL_WINDOW_DAYS = 30;

// Manual backup path alongside the automatic webhook, not a replacement for
// it (PRD 6.7) — covers meetings recorded before the connection existed, or
// an individual webhook delivery that failed.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not signed in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const connection = await prisma.fathomConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    return NextResponse.json(
      { error: "Fathom is not connected for this account", code: "NOT_CONNECTED" },
      { status: 400 }
    );
  }

  const since = new Date(Date.now() - BACKFILL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  try {
    const meetings = await listRecentMeetings(connection.apiKey, since);

    let imported = 0;
    for (const meeting of meetings) {
      // Same idempotency check the webhook path uses — skip anything
      // already imported (via webhook or a previous backfill run).
      const alreadyImported = await prisma.transcript.findFirst({
        where: { userId: connection.userId, fathomMeetingId: meeting.recordingId },
      });
      if (alreadyImported) continue;

      let rawText: string;
      try {
        rawText = normalizeTranscript(
          await fetchMeetingTranscript(connection.apiKey, meeting.recordingId)
        );
      } catch (err) {
        console.error(
          `Backfill: failed to fetch transcript for meeting ${meeting.recordingId}`,
          err
        );
        continue;
      }

      let transcript;
      try {
        transcript = await prisma.transcript.create({
          data: {
            userId: connection.userId,
            // `title` is Fathom's own displayed meeting name (matches its
            // dashboard); `meeting_title` is just the linked calendar
            // event's title, which is often a generic placeholder like
            // "Impromptu Zoom Meeting" when there's no real calendar event.
            title: meeting.title || meeting.meetingTitle || null,
            rawText,
            source: "fathom",
            fathomMeetingId: meeting.recordingId,
          },
        });
      } catch (err) {
        // A webhook delivery for this same meeting could land concurrently
        // with this backfill run — the unique constraint is the real guard.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          continue;
        }
        throw err;
      }

      try {
        await runExtractionForTranscript(transcript.id, transcript.rawText);
      } catch (err) {
        console.error(
          `Extraction failed for backfilled transcript ${transcript.id}`,
          err
        );
      }

      imported++;
    }

    return NextResponse.json({ imported });
  } catch (err) {
    if (err instanceof FathomRequestError) {
      console.error("Fathom backfill sync failed", err.status, err.fathomResponse);
      return NextResponse.json(
        { error: err.message, code: "FATHOM_REQUEST_FAILED" },
        { status: 502 }
      );
    }
    console.error("Fathom backfill sync failed", err);
    return NextResponse.json(
      { error: "Failed to sync meetings — try again", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
