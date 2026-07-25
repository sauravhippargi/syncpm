# SyncPM — Product Requirements Document (PRD)

## 1. Overview
SyncPM is an AI-powered tool for Program Managers that turns cross-functional meeting transcripts into tracked action items, assigned owners, flagged blockers, real Jira tickets, and drafted Slack follow-up messages — plus a weekly status dashboard. It's built primarily as a **portfolio project** to demonstrate the ability to design and ship an end-to-end AI product: LLM-based extraction, a genuine third-party API integration (Jira), and a clean, reviewable human-in-the-loop workflow.

## 2. Problem Statement
PMs run many cross-functional meetings. Action items get buried in notes, owners aren't always clear, blockers surface verbally but never get tracked, and manually creating Jira tickets, sending follow-ups, and compiling a weekly status report eats hours every week.

## 3. Target User
- **Primary (v1):** A single Program Manager (you) — also the intended demo user for interviews.
- **Secondary audience:** Interviewers/hiring managers evaluating your ability to build a real, working AI-powered tool with genuine API integrations — not just a UI mockup.
- Not built for team-wide or multi-tenant use in v1.

## 4. Goals (v1)
- Demonstrate a full AI pipeline: raw transcript → structured, useful output
- Demonstrate a genuine third-party API integration (Jira Cloud REST API) — not mocked
- Show a thoughtful human-in-the-loop UX: nothing gets created or sent without review
- (Secondary) Actually save time on your own PM workflow

## 5. Non-Goals (v1)
- No live Zoom/Google Meet integration — transcripts are uploaded manually
- No live Slack API integration — v1 only *drafts* the message; sending is manual copy/paste
- No multi-user accounts, auth, or permissions
- No paid APIs — AI extraction runs on a free-tier cloud LLM (Gemini or Groq, finalized in `architecture.md`)

## 6. Core Features

### 6.1 Transcript Ingestion
- Manual upload of a meeting transcript file (`.txt`, `.vtt`, `.srt`)
- Basic normalization: clean up speaker labels, strip unneeded timestamp noise, prep text for the AI pass

### 6.2 AI Extraction Engine
- **Action item extraction** — pulls concrete tasks discussed in the meeting
- **Owner assignment** — matches each action item to the participant it was assigned to, based on names mentioned in context
- **Blocker/risk detection** — flags language indicating a dependency or blockage (e.g. "waiting on," "blocked by," "can't move until")
- Powered by a free-tier LLM (Gemini or Groq)

### 6.3 Review & Edit (Human-in-the-loop)
- After extraction, a draft screen shows all action items, assigned owners, and detected blockers
- Everything is editable — reassign owners, fix wording, delete false positives, add missed items
- Approving an item is what unlocks the "Sync to Jira" action and the drafted Slack message

### 6.4 Jira Ticket Generation — real integration
- Targets a free Jira Cloud instance (e.g. a self-created "Acme Tech" workspace)
- Each approved action item gets a **"Sync to Jira"** button in the UI
- Clicking it calls the real Jira REST API to create an actual issue in a chosen project — title, description (with meeting context), assignee, due date if known
- Per-item status shown in the UI: not synced / synced / failed
- Auth method (API token + Basic Auth vs. OAuth 2.0) — to be decided in `architecture.md`

### 6.5 Slack Message Drafting
- For each owner, AI drafts a professional, plain-language message summarizing their action item(s) from the meeting
- No emojis, no filler ("just checking in!", "hope you're doing well!") — direct and professional
- Displayed in-app for the PM to copy and send manually — no live Slack API call in v1

### 6.6 Weekly Status Dashboard
- Aggregates all approved action items and blockers from the week's meetings
- Filterable by project/meeting
- Highlights overdue action items and open (unresolved) blockers

### 6.7 Transcript History
- List of all previously uploaded transcripts (filename, meeting title/date if available, upload timestamp)
- Clicking into one reopens its extracted action items, owners, blockers, and current Jira sync status

### 6.8 Jira Sync History
- Log of every Jira ticket SyncPM has ever created, each entry showing: source meeting, ticket link, assignee, sync status (synced/failed), timestamp
- Doubles as an audit trail — useful for a demo to show the traceable path from "meeting" to "real ticket"

### 6.9 Upcoming Deadlines Tab
- Cross-meeting view of all open action items sorted by due date (soonest first)
- Complements the Weekly Status Dashboard (6.6), which rolls up by week — this tab is a live, sorted "what's due next" queue
- Overdue items are visually flagged

## 7. Success Metrics
- **Portfolio/demo:** A live, working demo where a transcript goes in and a real Jira ticket comes out — verifiable by clicking through to the actual Jira board
- **Functional:** Time saved vs. manual note-taking + ticket creation + follow-ups
- **Quality:** % of meetings where action items are accurately captured and owners correctly assigned

## 8. Open Questions (to resolve in later docs)
- Jira auth: API token + Basic Auth (simpler) vs. OAuth 2.0 (more impressive to walk through in an interview) — decide in `architecture.md`
- Gemini vs. Groq for the free-tier LLM — decide in `architecture.md`
- Whether live Slack sending becomes a "Phase 2" feature (`phases.md`)
- How due dates get inferred when not explicitly stated in the transcript
- Fallback behavior when owner matching fails (nicknames, unclear pronouns, etc.)
