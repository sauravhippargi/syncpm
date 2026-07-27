# SyncPM — Product Requirements Document

## Overview
SyncPM is an AI-powered tool for Program Managers that turns cross-functional meeting transcripts into tracked action items, assigned owners, flagged blockers, real Jira tickets, and drafted follow-up messages. It's built as a portfolio project demonstrating an end-to-end AI product: LLM-based extraction, genuine third-party API integrations (Jira, Fathom), and a clean, reviewable human-in-the-loop workflow — not a mocked demo.

## Problem Statement
PMs run many cross-functional meetings. Action items get buried in notes, owners aren't always clear, blockers surface verbally but never get tracked, and manually creating tickets and follow-ups eats hours every week.

## Target Users
- **Primary:** Any Program Manager who creates an account. Each user's transcripts, action items, and tool connections are private to them — there's no shared workspace.
- **Secondary:** Product Managers running customer calls or internal cross-functional syncs with engineers, designers, and other stakeholders — the same extraction-to-ticket workflow applies regardless of who's actually in the meeting.

## Goals
- Demonstrate a full AI pipeline: raw transcript → structured, useful output
- Demonstrate genuine third-party API integrations (Jira Cloud REST API, Fathom API) — not mocked
- Show a thoughtful human-in-the-loop UX: nothing gets created or sent without explicit review
- Support real, secure multi-user accounts, each with private data
- (Secondary) Actually save time on real PM workflows

## Non-Goals (Deliberate Scope Decisions)
- No live Zoom/Google Meet integration — both require a paid plan just to access transcript data via their APIs, which conflicts with this project's no-spend constraint. They remain visible "Coming soon" placeholders to signal the intended design.
- No live message-sending integration — messages are AI-drafted and shown for manual copy/paste, deliberately tool-agnostic (works equally for Slack, Teams, or anywhere else) rather than tied to one platform.
- No Asana or Linear ticket creation yet — shown as "Coming soon" in the connector picker to signal an extensible design; Jira is the one fully real integration.
- No epic assignment on created tickets — Jira's epic field differs by project type (team-managed vs. company-managed), meaningfully more complex than assignee/priority and deliberately deferred.
- No paid APIs anywhere in the stack — LLM extraction, auth, and both third-party integrations all run on free tiers.

## Core Features

### 1. Authentication & Accounts
Email/password accounts with hashed credentials. A single landing page doubles as marketing site and sign-in/sign-up — every other feature requires an account, and each account's data is fully isolated.

### 2. Meeting Ingestion
Transcripts can be added two ways: manual upload/paste (`.txt`, `.vtt`, `.srt`), or a real Fathom integration — connect once via a personal API key, and every future meeting recorded through Fathom imports and runs through extraction automatically, with no manual step. A registered webhook handles delivery in real time, with a manual "sync" fallback to catch anything missed (e.g. meetings recorded before connecting).

### 3. AI Extraction Engine
Pulls action items, assigns likely owners based on who was actually discussed in context, and flags blockers from natural dependency language ("waiting on," "blocked by"). Extraction is the source of truth throughout — even for Fathom-imported meetings, SyncPM re-extracts rather than trusting Fathom's own built-in detection, keeping output consistent regardless of how a transcript arrived.

### 4. Review & Approve
Every extracted item is shown for review before anything downstream happens — editable owner, due date, status, and a free-text blocker description. Nothing is auto-approved; a single explicit action (Save) marks items as approved and moves them into the active workspace.

### 5. Action Items — Central Workspace
The single place where approved items live and get acted on, across every meeting. Each item can be assigned a status, raised as a real Jira ticket, or turned into a drafted follow-up message — all from the same row. Open and completed items are kept visually separate so the list stays useful as history accumulates.

### 6. Jira Ticket Creation
A real integration, not a mock: each user connects their own Jira Cloud site via OAuth 2.0 — no shared credentials, no API tokens. Creating a ticket opens a lightweight review step (project, assignee, priority — all pre-filled with sensible defaults, always overridable) before anything is written to Jira. Assignee is matched by name against real project members; priority defaults from whether the item was flagged as a blocker.

### 7. Follow-Up Message Drafting
AI drafts a professional, personally-addressed message per action item — reframed as a natural follow-up rather than a verbatim echo of the extracted task description, since the two read very differently to the person receiving it. Editable before use, with no live send integration — copy and paste into whatever tool the team actually uses.

### 8. Dashboard
The default view after signing in: at-a-glance stats (open items, blockers, completed items, tickets raised), a recent-activity view, and upcoming deadlines. First-time users see a guided empty state rather than a blank page.

### 9. Transcript & Deadline History
A full history of every ingested transcript, and a dedicated view of all open action items sorted by due date — both scoped to what's actually been reviewed and approved, so these views always match what's genuinely being tracked.

## Success Metrics
- **Portfolio/demo:** A live, working demo where a Fathom meeting auto-imports and a real Jira ticket comes out the other end — verifiable end to end, no manual steps in between
- **Functional:** Time saved vs. manual note-taking, ticket creation, and follow-ups
- **Quality:** Percentage of meetings where action items are accurately captured and owners correctly assigned

## Future Considerations
- Real Asana and Linear integrations, beyond the current placeholders
- Support for connecting more than one Jira site or Fathom account per user
- Smarter handling of very short or interrupted meetings, so a recording accidentally left running for a few minutes doesn't get treated the same as a full meeting
- Password reset and email verification, if this grows beyond a single-portfolio-demo scope
