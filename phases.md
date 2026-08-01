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
- *(Added later)* Placeholder connectors (Zoom, Otter.ai, Google Meet) with real logos above the manual upload area — visual only, "Coming soon" on click
- *(Redesigned later)* Otter.ai swapped for Fathom (the only one of the three that's real, see Phase 7). Review & Edit itself reworked: bulk checkbox selection (checked by default), a single page-level "Save all"/"Save selected" button, blockers changed from a checkbox to a free-text field, and "Raise a ticket" removed from this screen entirely — approval and ticket creation split into two separate steps (see Phase 4's Action Items tab)

## Phase 2 — Authentication & Multi-user Accounts
Goal: turn this from a single-user tool into one where any PM can sign up and keep their own private data.
- `users` table added to Prisma schema (`id`, `email`, `hashed_password`, `created_at`)
- `user_id` foreign key added to `transcripts`
- Auth.js (Credentials provider, JWT strategy) wired up — sign up (hash + store password) and sign in (verify + issue session)
- Combined landing + sign in/sign up page built at the root route
- Middleware protects `/upload`, `/review`, `/history`, `/deadlines`, `/dashboard` — redirects unauthenticated visitors to `/`, and redirects already-authenticated visitors away from `/` to `/dashboard`
- Every existing query updated to filter by the signed-in user's `user_id`
- **Persistent sidebar shell** (vertical nav: Dashboard, Upload transcript, Transcript history, Raise a ticket, Deadlines, signed-in user + sign out) wrapping every authenticated page
- **Dashboard home page** — the real post-login landing screen: open item/blocker/synced-to-Jira counts, most recent transcript, upcoming deadlines preview, with an empty state if no transcripts exist yet

## Phase 3 — Raise a Ticket: Jira OAuth Integration
Goal: prove the real third-party integration works — and make it a genuine per-user connection, not a shared demo credential, since this app has real multi-user accounts.

*Note: this phase was originally built with a single shared Basic Auth token (fine for a solo demo), then rebuilt on real per-user OAuth once the multi-user pivot made the shared-credential approach architecturally wrong — every user's tickets would otherwise land in the account owner's own Jira.*

- Jira OAuth app registered in the Atlassian Developer Console (`JIRA_OAUTH_CLIENT_ID`/`JIRA_OAUTH_CLIENT_SECRET`)
- `jira_connections` table added, scoped one-per-user
- OAuth flow: connect → Atlassian consent screen → callback exchanges code for access/refresh tokens → stored against the signed-in user
- Token refresh handled automatically before expired tokens are used
- **"Raise a ticket" tab**, replacing the old standalone Jira tab: connector picker (Jira live; Asana/Linear "Coming soon" placeholders) when not connected; connected-workspace info, default-project selector, and recent-tickets list when connected
- "Sync to Jira" button on approved action items, routing to this tab first if not yet connected
- Real issue creation via Jira REST API v3, called through `api.atlassian.com` with the user's own token
- `jira_sync_log` populated with result (synced/failed + issue link)
- *(Added later)* Real Jira/Asana/Linear logos (via `simple-icons`) replacing flat placeholder blocks in the connector picker
- *(Added later)* Renamed "Sync to Jira" to "Raise a ticket"; clicking it now opens a modal (assignee + priority, both pre-filled and overridable) instead of syncing immediately with no configuration. Epic assignment deliberately deferred — see `prd.md` non-goals.

## Phase 4 — History & Tracking Views
Goal: build out the remaining full-list views the Dashboard's previews link out to.
- Transcript History tab (scoped to the signed-in user)
- Upcoming Deadlines tab — full, filterable list of all open items across the user's own transcripts, sorted by due date
- *(Added later)* **Action Items tab** — the master list of every approved item across all transcripts (`is_approved = true`), replacing the per-item "Raise a ticket" button that used to live on Review & Edit. Each row: description, owner, due date, blocker tag if applicable, source transcript, and Raise a ticket / edit / delete actions.

*(Jira sync history now lives inside the Raise a Ticket tab from Phase 3, rather than as its own separate view.)*

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
- *(Added early)* Staged-message loading animation while extraction is in flight, on the Upload transcript page (`components/ExtractionLoader.tsx`)

## Phase 7 — Real Fathom Integration
Goal: replace manual upload with genuine automatic transcript import, for meetings recorded via Fathom — confirmed through research to be the only one of the three source placeholders (Fathom, Zoom, Google Meet) with a real, free, self-serve API. Its public API and webhooks are available to all users on all plans including free, with no paid-tier or enterprise-sales gate — unlike Zoom (requires a paid Pro+ plan just for transcript access) or Google Meet (requires a paid Workspace tier *and* a paid third-party security assessment for the relevant OAuth scopes).

Being tackled ahead of Phases 5/6 since it's the more substantial integration and benefits from momentum off the Jira OAuth work.

**Auth approach:** personal API key, not OAuth — Fathom's own docs frame OAuth as only necessary for building an officially marketplace-listed integration for other companies to install; a plain API key already gets per-user scoping for free (Fathom API keys are tied to the individual user who generated them, not an organization), which is exactly what a personal connection needs without the extra complexity of a redirect-based consent flow.

**Import approach:** fully automatic via webhook, not on-demand polling — every new Fathom meeting imports itself with no click required, matching the original product vision from `prd.md`'s overview.

- `fathom_connections` table: `user_id` (FK, unique), `api_key`, `fathom_webhook_id`, `created_at`
- Connect flow: user pastes their personal Fathom API key (with a link to where Fathom shows it in their account settings) → SyncPM validates it with a test call → registers a webhook with Fathom requesting transcript, summary, and action-item data → stores the connection
- Webhook route is multi-tenant-aware: the registered callback URL includes the `fathom_connections` row's own id (`/api/integrations/fathom/webhook/[connectionId]`), so incoming events map to the right user unambiguously
- Webhook payload authenticity is verified before any processing — exact signature mechanism to be confirmed against current Fathom docs during implementation (flagged in `prd.md`'s open questions), not assumed
- On a verified "meeting ready" event: fetch the transcript via the Fathom API, check `fathom_meeting_id` against existing transcripts to avoid duplicate imports if the webhook fires more than once, then feed the raw transcript into the same Gemini extraction pipeline already built for manual uploads — SyncPM's own extraction stays the source of truth, not Fathom's built-in action item detection
- From here, the imported transcript flows through the exact same Review & Edit → Raise a ticket → Slack draft pipeline as anything manually uploaded
- Transcript History displays each transcript's source (manual vs. Fathom)
- The Upload screen's Fathom placeholder becomes a real "Connect"/"Connected" state; Zoom and Google Meet remain "Coming soon" placeholders indefinitely — both require paying for API access, which conflicts with this project's no-spend constraint
- Disconnecting deletes the registered webhook on Fathom's side, then the local `fathom_connections` row
- *(Added later)* A manual "Sync recent Fathom meetings" button on Transcript History — lists meetings from the last 30 days via the Fathom API and imports any whose `fathom_meeting_id` isn't already present, using the same idempotency check as the webhook path. Covers two gaps the webhook alone can't: meetings recorded before the user connected, and any individual webhook delivery that failed.

---

## Phase 8 — Extraction Evaluation Harness
Goal: a lightweight, repeatable way to measure and catch regressions in the core AI extraction pipeline. Not user-facing at all — this is pure engineering rigor, but a strong one given extraction is the whole premise of the product. Formalizes testing that's so far been manual/ad-hoc into something structured and re-runnable.

- `evals/cases/` — the existing four sample transcripts (weekly-cross-functional-sync.txt, engineering-sprint-sync.vtt, customer-escalation-call.srt, casual-team-catchup-vague.txt), each paired with a hand-authored expected output, formalizing what were previously just prose "answer keys" into structured, machine-checkable JSON
- `evals/run.ts` — calls the same shared `lib/extraction.ts` function the real app uses (not a separate reimplementation), so the eval can't drift out of sync with actual production behavior
- Scored per case: item recall (expected items found), item precision (no invented items — the "onboarding refresh" trap in the vague transcript is exactly this), owner accuracy, blocker-note accuracy (the real miss found in earlier manual testing), and due-date non-hallucination
- **Runs each case multiple times (e.g. 3-5 trials) and reports a pass rate, not a single pass/fail** — necessary because temperature=0 reduces but doesn't eliminate output variance, confirmed directly in this project's own testing; a single-run eval would be an unreliable signal
- Simple console/markdown report, run via `npm run eval` — a dev-only tool, not part of the deployed app

## Future / Post-v1 Roadmap (not built now — for interview discussion)
- Live Slack sending via the Slack API (currently draft-only)
- Real Asana and Linear integrations (currently "Coming soon" placeholders in the connector picker)
- Support connecting more than one Jira site per user
- Support connecting more than one Fathom account per user
- Password reset and email verification flow
