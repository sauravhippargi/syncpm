# SyncPM — Product Requirements Document (PRD)

## 1. Overview
SyncPM is an AI-powered tool for Program Managers that turns cross-functional meeting transcripts into tracked action items, assigned owners, flagged blockers, real Jira tickets, and drafted Slack follow-up messages — plus a weekly status dashboard. It's built primarily as a **portfolio project** to demonstrate the ability to design and ship an end-to-end AI product: LLM-based extraction, a genuine third-party API integration (Jira), and a clean, reviewable human-in-the-loop workflow.

## 2. Problem Statement
PMs run many cross-functional meetings. Action items get buried in notes, owners aren't always clear, blockers surface verbally but never get tracked, and manually creating Jira tickets, sending follow-ups, and compiling a weekly status report eats hours every week.

## 3. Target User
- **Primary (v1):** Any Program Manager who creates an account — each user's transcripts, action items, and Jira connection are private to them.
- **Secondary audience:** Interviewers/hiring managers evaluating your ability to build a real, working AI-powered tool with genuine API integrations — they can sign up with their own account, connect their own Jira, and try it live.
- Each user connects their own Jira Cloud site via OAuth — there is no shared workspace. The account owner's own "Acme Tech" site is just their personal connection, made through the same flow as anyone else.

## 4. Goals (v1)
- Demonstrate a full AI pipeline: raw transcript → structured, useful output
- Demonstrate a genuine third-party API integration (Jira Cloud REST API) — not mocked
- Show a thoughtful human-in-the-loop UX: nothing gets created or sent without review
- Support real, secure multi-user accounts — each PM's data is private to their account
- (Secondary) Actually save time on your own PM workflow

## 5. Non-Goals (v1)
- No live Zoom/Google Meet/Otter.ai integration — transcripts are uploaded manually; these appear only as visual "Coming soon" placeholders on the Upload screen
- No live Slack API integration — v1 only *drafts* the message; sending is manual copy/paste
- No Asana or Linear functionality — shown in the connector picker as "Coming soon" placeholders to signal the extensible design, but not functional
- No support for connecting more than one Jira site per user in v1
- No password reset or email verification flow — can be added later if the tool grows beyond a portfolio demo
- No paid APIs — AI extraction runs on a free-tier cloud LLM (Gemini), auth uses a free, self-hosted library (no Clerk/Auth0), Jira OAuth app registration is free

## 6. Core Features

### 6.0 Authentication & Accounts
- Combined landing + sign in/sign up page at the root route
- Email + password accounts (hashed, never stored in plain text)
- Every other feature below requires being signed in — unauthenticated visitors are redirected here
- Each user's transcripts, action items, and history are private to their account

### 6.1 Transcript Ingestion
- Manual upload of a meeting transcript file (`.txt`, `.vtt`, `.srt`)
- Basic normalization: clean up speaker labels, strip unneeded timestamp noise, prep text for the AI pass
- Placeholder connectors (Zoom, Otter.ai, Google Meet) shown above the manual upload area with their real logos — visual only, clicking shows a "Coming soon" message, matching the Asana/Linear pattern already used in Raise a Ticket

### 6.2 AI Extraction Engine
- **Action item extraction** — pulls concrete tasks discussed in the meeting
- **Owner assignment** — matches each action item to the participant it was assigned to, based on names mentioned in context
- **Blocker/risk detection** — flags language indicating a dependency or blockage (e.g. "waiting on," "blocked by," "can't move until")
- Powered by a free-tier LLM (Gemini or Groq)

### 6.3 Review & Edit (Human-in-the-loop)
- After extraction, a draft screen shows all action items, assigned owners, and detected blockers
- Everything is editable — reassign owners, fix wording, delete false positives, add missed items
- Approving an item is what unlocks the "Sync to Jira" action and the drafted Slack message

### 6.4 Raise a Ticket — connector picker + real Jira integration
- Replaces the earlier standalone "Jira tickets" tab with a single **"Raise a ticket"** screen that also serves as the connection point for other tools
- **Not connected:** shows a picker of connectable tools — Jira (functional), Asana and Linear (shown with logos and a "Coming soon" badge, disabled)
- **Connecting Jira:** OAuth 2.0 — the user is redirected to Atlassian's own consent screen, approves access, and lands back in SyncPM with their own Jira site connected. No API tokens or shared credentials involved.
- **Connected:** shows which site/workspace is connected, a default-project selector, a "Disconnect" option, and a list of recently created tickets (this list replaces the earlier separate Jira Sync History tab)
- Each approved action item gets a **"Sync to Jira"** button; if the user hasn't connected Jira yet, clicking it routes them to this tab first
- Clicking sync calls the real Jira REST API to create an actual issue in the user's chosen project — title, description (with meeting context), assignee left unset (see below), due date if known
- Per-item status shown in the UI: not synced / synced / failed
- Jira Cloud assigns issues by internal `accountId`, which can't be resolved from a freeform extracted name — assignee is intentionally left blank, with the owner's name kept visible in the ticket description instead

### 6.5 Slack Message Drafting
- For each owner, AI drafts a professional, plain-language message summarizing their action item(s) from the meeting
- No emojis, no filler ("just checking in!", "hope you're doing well!") — direct and professional
- Displayed in-app for the PM to copy and send manually — no live Slack API call in v1

### 6.6 Dashboard (Home)
- The default screen after signing in — replaces a blank upload form as the landing experience, so the app feels alive on login rather than starting from zero every time
- Persistent sidebar (logo, Dashboard, Upload transcript, Transcript history, Raise a ticket, Deadlines, signed-in user + sign out) wraps every authenticated page
- Shows: open action item count, blocker count, tickets synced to Jira; the most recently uploaded transcript with a link into its Review screen; a short preview of upcoming deadlines
- If no transcripts exist yet, shows an empty state with a clear call-to-action to upload the first one

### 6.7 Transcript History
- List of all previously uploaded transcripts (filename, meeting title/date if available, upload timestamp)
- Clicking into one reopens its extracted action items, owners, blockers, and current Jira sync status

### 6.8 Upcoming Deadlines Tab
- Cross-meeting view of all open action items sorted by due date (soonest first)
- Complements the Dashboard's deadlines preview (6.6), which only shows a short list — this is the full, filterable view
- Overdue items are visually flagged

## 7. Success Metrics
- **Portfolio/demo:** A live, working demo where a transcript goes in and a real Jira ticket comes out — verifiable by clicking through to the actual Jira board
- **Functional:** Time saved vs. manual note-taking + ticket creation + follow-ups
- **Quality:** % of meetings where action items are accurately captured and owners correctly assigned

## 8. Open Questions
- How due dates get inferred when not explicitly stated in the transcript
- Fallback behavior when owner matching fails (nicknames, unclear pronouns, etc.)
- Whether Asana/Linear become real integrations later, or stay as "Coming soon" indefinitely
- Whether password reset/email verification gets added later, or stays out of scope permanently

**Resolved:** Jira uses OAuth 2.0 (per-user, no shared credentials) · LLM is Gemini · Auth uses Auth.js (Credentials provider), not Clerk/Auth0
