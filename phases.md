# SyncPM — Build Phases

Phases are ordered to de-risk the riskiest piece first (a real external API integration) before investing in more UI, and to get something deployed and clickable as early as possible.

*Note: Authentication (Phase 2 below) was added to the plan after Phase 0 and Phase 1 were already built — ideally it would have come before Phase 1, but since it landed after, any test data created before this phase needed re-testing under a real account once `user_id` scoping was added.*

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

## Phase 2 — Authentication & Multi-user Accounts
Goal: turn this from a single-user tool into one where any PM can sign up and keep their own private data.
- `users` table added to Prisma schema (`id`, `email`, `hashed_password`, `created_at`)
- `user_id` foreign key added to `transcripts`
- Auth.js (Credentials provider, JWT strategy) wired up — sign up (hash + store password) and sign in (verify + issue session)
- Combined landing + sign in/sign up page built at the root route
- Middleware protects `/upload`, `/review`, `/history`, `/deadlines`, `/dashboard` — redirects unauthenticated visitors to `/`
- Every existing query updated to filter by the signed-in user's `user_id`

## Phase 3 — Jira Integration
Goal: prove the real third-party integration works, since this is the highest-value portfolio piece and the most likely to have surprises (auth, field mapping, API quirks).
- Jira Cloud test workspace set up ("Acme Tech")
- API token + Basic Auth wired up server-side
- "Sync to Jira" button on approved action items
- Real issue creation via Jira REST API v3
- `jira_sync_log` populated with result (synced/failed + issue link)

## Phase 4 — History & Tracking Views
Goal: turn stored data into the views that make this feel like a real tool, not a one-shot demo.
- Transcript History tab (scoped to the signed-in user)
- Jira Sync History tab (scoped to the signed-in user)
- Upcoming Deadlines tab — all open items across the user's own transcripts, sorted by due date
- Weekly Status Dashboard — aggregated by week, scoped to the signed-in user

## Phase 5 — Slack Message Drafting
Goal: round out the "AI does the busywork" story.
- AI drafts a professional, filler-free message per owner summarizing their action item(s)
- Displayed in-app for manual copy/paste

## Phase 6 — Design Polish
Goal: make it presentable for a portfolio walkthrough.
- Apply color/theme/typography from `design.md`
- Loading, empty, and error states for every screen
- Responsive pass
- Simple landing/overview page explaining what the tool does (good for a portfolio link)

---

## Future / Post-v1 Roadmap (not built now — for interview discussion)
- Live Zoom/Google Meet integration (auto-pull transcripts instead of manual upload)
- Live Slack sending via the Slack API (currently draft-only)
- Per-user Jira credentials (currently: one shared workspace for all accounts)
- OAuth 2.0 for Jira instead of Basic Auth, if a fully multi-tenant/commercial version is ever built
- Password reset and email verification flow
