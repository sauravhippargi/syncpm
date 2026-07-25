# SyncPM — Architecture

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Single framework for both UI and API routes — one deploy, no separate backend service to host |
| Styling | Tailwind CSS | Fast to build with; visual details finalized in `design.md` |
| Database | Postgres via Supabase (free tier) | Free, generous enough for single-user history data (transcripts, action items, sync logs); no separate file storage needed since transcripts are plain text |
| ORM | Prisma | Type-safe queries, simple migrations, easy to explain in an interview |
| LLM (extraction) | Google Gemini API (`gemini-2.5-flash` or `flash-lite`) | Free tier, ~1,500 requests/day, 1M tokens/minute — comfortably handles full transcripts; native structured JSON output reduces parsing failures |
| Jira integration | Jira Cloud REST API v3, via OAuth 2.0 (3LO) | Each user connects their own Jira site — no shared credentials. Access tokens call through `api.atlassian.com/ex/jira/{cloudId}/...`, refreshed automatically when expired |
| Auth | Auth.js (NextAuth v5), Credentials provider | Free, self-hosted — no Clerk/Auth0 account needed; JWT session strategy with a manual Prisma lookup in `authorize()`, so no extra Account/Session tables are required |
| Hosting | Vercel (Hobby/free tier) | Zero-cost hosting for a personal-use Next.js app; interviewers can click into a live URL |

## 2. App Flow

```mermaid
flowchart TD
    Z[Sign in / sign up] --> Z2{Authenticated?}
    Z2 -->|No| Z
    Z2 -->|Yes| Dash[Dashboard home]
    Dash --> A[User uploads transcript]
    A --> B[(Stored in Postgres: transcripts table, owned by userId)]
    B --> C[API route sends transcript to Gemini]
    C --> D[Gemini returns structured JSON:\naction items, owners, blockers]
    D --> E[(Stored: action_items table)]
    E --> F[Review & Edit screen]
    F -->|Approve item| G{Actions unlocked}
    G --> H{Jira connected?}
    H -->|No| R[Raise a ticket tab:\nconnector picker]
    R -->|Connect| OA[Redirect to Atlassian OAuth consent]
    OA --> OB[(jira_connections table:\ntokens stored per userId)]
    OB --> H
    H -->|Yes| J[Jira REST API creates real issue]
    G --> I[Slack message drafted]
    J --> K[(jira_sync_log table)]
    I --> L[Displayed in-app for manual copy]
    E --> M[Transcript History tab]
    K --> R
    E --> O[Upcoming Deadlines tab\nsorted by due date]
    E --> Dash
```

**Walkthrough:**
0. Visitor lands on the combined landing/login page. Once authenticated, they're redirected to `/dashboard` — a persistent sidebar (logo, Dashboard, Upload transcript, Transcript history, Raise a ticket, Deadlines, signed-in user + sign out) wraps every page from here on. Middleware redirects unauthenticated requests for any of these routes back to `/`; it also redirects an already-authenticated visitor away from `/` straight to `/dashboard`.
1. From the sidebar, the user uploads a transcript (paste text or `.txt`/`.vtt`/`.srt` file) → stored in the `transcripts` table, tagged with their `userId`.
2. An API route sends the transcript to Gemini with a prompt requesting structured JSON output (action items, assigned owners, blockers).
3. The parsed result is stored in the `action_items` table, linked to the source transcript.
4. The Review & Edit screen shows everything for the user to correct before anything goes further.
5. Approving an item unlocks two things:
   - **Sync to Jira** — if the user has no Jira connection yet, this routes them to the **Raise a ticket** tab, which shows a picker of connectable tools (Jira live; Asana and Linear shown as "Coming soon" placeholders). Connecting Jira redirects to Atlassian's OAuth consent screen; on approval, SyncPM stores that user's access/refresh token in `jira_connections`, scoped to their `userId`. Once connected, syncing calls the Jira REST API with that user's own token to create a real issue; the result (success/failure, issue link) is logged in `jira_sync_log`.
   - **Slack draft** — a professional message is generated and shown for manual copy/paste (no live send in v1).
6. Four views read from this same data: Transcript History, **Raise a ticket** (connector status + recently created tickets, replacing the earlier separate Jira Sync History tab), Upcoming Deadlines (all open items sorted by due date), and **Dashboard** — the merged home/overview screen showing open item/blocker/synced counts, the most recent transcript, and a deadlines preview. If the user has no transcripts yet, Dashboard shows an empty state with a call-to-action to upload their first one instead.

## 3. Folder & File Structure

```
syncpm/
├── middleware.ts                      # Redirects unauthenticated requests to /, and authenticated visitors away from / to /dashboard
├── app/
│   ├── page.tsx                       # Combined landing + sign in/sign up page
│   ├── (app)/
│   │   ├── layout.tsx                 # Persistent sidebar shell wrapping every authenticated page
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Dashboard home: stats, recent transcript, deadlines preview
│   │   ├── upload/
│   │   │   └── page.tsx               # Transcript upload screen
│   │   ├── review/[transcriptId]/
│   │   │   └── page.tsx               # Review & edit extracted items
│   │   ├── history/
│   │   │   └── transcripts/page.tsx   # Transcript history
│   │   ├── raise-a-ticket/
│   │   │   └── page.tsx               # Connector picker (Jira live; Asana/Linear "Coming soon") + connected state + recent tickets
│   │   └── deadlines/
│   │       └── page.tsx               # Full upcoming deadlines list
│   └── api/
│       ├── auth/[...nextauth]/route.ts # Auth.js sign in/sign up handlers
│       ├── integrations/jira/
│       │   ├── connect/route.ts       # Redirects to Atlassian OAuth consent
│       │   ├── callback/route.ts      # Exchanges code for tokens, stores in jira_connections
│       │   └── disconnect/route.ts    # Revokes/deletes the stored connection
│       ├── transcripts/route.ts       # Handles upload + storage
│       ├── extract/route.ts           # Calls Gemini, parses response
│       ├── jira/sync/route.ts         # Calls Jira REST API using the signed-in user's stored token
│       └── slack/draft/route.ts       # Generates Slack message draft
├── lib/
│   ├── db.ts                          # Prisma client instance
│   ├── auth.ts                        # Auth.js config (Credentials provider, JWT)
│   ├── gemini.ts                      # Gemini API wrapper
│   ├── jira.ts                        # Jira API client — resolves the user's stored OAuth token, refreshes if expired, calls api.atlassian.com
│   └── prompts/
│       └── extraction.ts              # Prompt templates + JSON schema
├── components/
│   ├── Sidebar.tsx                    # Persistent nav: logo, links with active-route highlight, user email + sign out
│   ├── ActionItemCard.tsx
│   ├── TranscriptUploader.tsx
│   ├── JiraSyncButton.tsx
│   ├── ConnectorPicker.tsx            # Jira/Asana/Linear cards, Connect buttons, "Coming soon" states
│   └── SlackDraftCard.tsx
├── prisma/
│   └── schema.prisma
├── prd.md
├── architecture.md
├── rules.md
├── phases.md
├── design.md
├── .env.example
└── package.json
```

## 4. Data Model (high-level)

- **users** — `id`, `email` (unique), `hashed_password`, `created_at`
- **jira_connections** — `id`, `user_id` (FK, unique — one connection per user in v1), `access_token`, `refresh_token`, `expires_at`, `cloud_id`, `site_url`, `site_name`, `project_key` (chosen default project), `created_at`
- **transcripts** — `id`, `user_id` (FK, owner), `title`, `uploaded_at`, `raw_text`
- **action_items** — `id`, `transcript_id` (FK), `description`, `owner`, `due_date`, `status` (open/done), `is_blocker`, `blocker_note`
- **jira_sync_log** — `id`, `action_item_id` (FK), `jira_issue_key`, `jira_url`, `status` (synced/failed), `synced_at`

Ownership is scoped at the `transcripts` level only — `action_items` and `jira_sync_log` inherit ownership through their parent transcript, so every query for a user's data filters `transcripts` by `user_id` first, then joins down. `jira_connections` is scoped directly by `user_id`.

## 5. Key Technical Considerations

- **Vercel Hobby function timeout** is 10 seconds by default — keep the Gemini extraction call as a single request per transcript (not per action item), and configure `maxDuration` on that route if longer transcripts need it.
- **Gemini free tier** is generous for single-user use, but code defensively for `429` responses with exponential backoff.
- **Jira credentials** — the OAuth app's own `JIRA_OAUTH_CLIENT_ID` and `JIRA_OAUTH_CLIENT_SECRET` live in Vercel environment variables (these identify SyncPM itself to Atlassian, shared across all users); each individual user's access/refresh tokens live in `jira_connections`, never in environment variables or client-side code.
- **No secrets in git** — ship a `.env.example` with placeholder keys; the real `.env` is gitignored.
- **Passwords** are hashed with bcrypt before storage — never stored or logged in plain text.
- **`AUTH_SECRET`** (required by Auth.js) lives in environment variables like every other secret — generate once, set in `.env` and all three Vercel environments.
- **Every data-fetching query** must filter by the signed-in user's `user_id` — there is no "admin" or cross-user view in v1, so a missed filter is a real data leak between accounts, not just a display bug.
- **Dashboard and Deadlines queries** sort across all of a user's `action_items` by `due_date` — fine at this data scale without one, but add a Prisma index on `(transcript_id, due_date)` if it's ever noticeably slow.
- **Jira OAuth tokens expire** (roughly hourly) and the refresh token rotates on each use — `lib/jira.ts` must check `expires_at` before every call, refresh if needed, and overwrite both `access_token` and `refresh_token` in `jira_connections` with the new pair Atlassian returns. Using a stale refresh token after it's rotated will fail.
