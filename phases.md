# SyncPM — Build Phases

Phases are ordered to de-risk the riskiest piece first (a real external API integration) before investing in more UI, and to get something deployed and clickable as early as possible.

## Phase 0 — Scaffolding & Deploy Skeleton
Goal: an empty-but-live app, deployed from day one.
- Next.js (App Router) + TypeScript project init
- Tailwind configured
- Prisma schema stubbed (`transcripts`, `action_items`, `jira_sync_log`)
- Supabase Postgres connected
- Deployed to Vercel with a working `/` route
- `.env.example` in place

## Phase 1 — Transcript Upload & AI Extraction
Goal: prove the core AI pipeline works end to end.
- Manual transcript upload (`.txt`/`.vtt`/`.srt` or pasted text)
- Transcript stored in `transcripts` table
- Gemini extraction call: action items, owners, blockers, returned as structured JSON
- Extracted items stored in `action_items` table
- Basic Review & Edit screen (view/edit/delete extracted items — no downstream actions yet)

## Phase 2 — Jira Integration (de-risked early)
Goal: prove the real third-party integration works, since this is the highest-value portfolio piece and the most likely to have surprises (auth, field mapping, API quirks).
- Jira Cloud test workspace set up ("Acme Tech")
- API token + Basic Auth wired up server-side
- "Sync to Jira" button on approved action items
- Real issue creation via Jira REST API v3
- `jira_sync_log` populated with result (synced/failed + issue link)

## Phase 3 — History & Tracking Views
Goal: turn stored data into the views that make this feel like a real tool, not a one-shot demo.
- Transcript History tab
- Jira Sync History tab
- Upcoming Deadlines tab (all open items, sorted by due date)
- Weekly Status Dashboard (aggregated by week)

## Phase 4 — Slack Message Drafting
Goal: round out the "AI does the busywork" story.
- AI drafts a professional, filler-free message per owner summarizing their action item(s)
- Displayed in-app for manual copy/paste

## Phase 5 — Design Polish
Goal: make it presentable for a portfolio walkthrough.
- Apply color/theme/typography from `design.md`
- Loading, empty, and error states for every screen
- Responsive pass
- Simple landing/overview page explaining what the tool does (good for a portfolio link)

---

## Future / Post-v1 Roadmap (not built now — for interview discussion)
- Live Zoom/Google Meet integration (auto-pull transcripts instead of manual upload)
- Live Slack sending via the Slack API (currently draft-only)
- Multi-user support with auth (currently single-user)
- OAuth 2.0 for Jira instead of Basic Auth, if a multi-tenant version is ever built
