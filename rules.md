# SyncPM — Rules & Conventions

## 1. Tech Stack: Use vs. Avoid

### Use
- Next.js (App Router) + TypeScript — strict mode, no `any` unless justified with a comment
- Tailwind CSS for all styling — no CSS-in-JS libraries, no standalone `.css` files unless global
- Prisma as the only ORM — no raw SQL unless Prisma genuinely can't express the query
- Supabase Postgres as the only database — no local SQLite, no mixing databases
- Google Gemini API as the only LLM provider — no fallback to OpenAI/Anthropic/Groq unless this doc is updated
- Jira Cloud REST API v3 via OAuth 2.0 (3LO) — per-user connections, no shared credentials, no Basic Auth/API tokens in v1
- Auth.js (NextAuth v5), Credentials provider, JWT session strategy — the only auth library
- Vercel for hosting — no other deploy targets

### Avoid
- No paid APIs or services of any kind — every external call must be verifiably free-tier
- No state management libraries (Redux, Zustand, etc.) — React state + Server Components/URL state is enough for this app's scope
- No auth providers other than Auth.js Credentials for *signing into SyncPM itself* — no Clerk, no Auth0, no custom-rolled session/cookie handling, no "Sign in with Google" style social login (this is separate from Jira's own OAuth connection, which is a third-party integration, not an app login method)
- No browser storage (`localStorage`/`sessionStorage`) — all persistence goes through Postgres
- No unnecessary abstraction layers (repository pattern, DI frameworks, etc.) — keep it direct and readable; this needs to be walked through in an interview, not maintained by a large team

## 2. Error Handling

- **Gemini calls** — wrap in try/catch; on `429`, retry up to 3x with exponential backoff (1s → 2s → 4s); on final failure, show a clear in-app error ("Extraction failed — try again") instead of a silent blank screen
- **Gemini output validation** — always validate returned JSON against the expected schema before saving; if it doesn't match, don't silently coerce it — show the raw output and let the user manually add action items instead
- **Jira sync** — every attempt (success or failure) is logged in `jira_sync_log`; failures should surface the actual Jira error message in the UI, not a generic "something went wrong"
- **Jira token refresh failure** — if a stored refresh token is rejected (e.g. the user revoked access from Atlassian's side), delete the `jira_connections` row and show a clear "Your Jira connection expired — reconnect" message with a button back to the Raise a ticket tab, rather than silently failing every sync attempt
- **Sync attempted with no connection** — if a user clicks "Sync to Jira" before connecting, route them to the Raise a ticket tab instead of showing an error
- **File upload** — validate file type (`.txt`, `.vtt`, `.srt`) and cap size (e.g. 2MB) before accepting a transcript
- **Sign in failures** — return a generic "Invalid email or password" for both a wrong email and a wrong password; never reveal which one was incorrect
- **Sign up failures** — if the email is already registered, say so plainly ("An account with this email already exists") rather than a generic error
- Every API route returns a consistent error shape: `{ error: string, code?: string }` — never throw raw exceptions to the client

## 3. Security & Secrets

- Gemini API key, `AUTH_SECRET`, and the Jira OAuth app's `JIRA_OAUTH_CLIENT_ID`/`JIRA_OAUTH_CLIENT_SECRET` live only in server-side environment variables — never exposed in client-side code
- Individual users' Jira access/refresh tokens live only in the `jira_connections` table — never logged, never sent to the client, never included in error messages
- `.env` is gitignored; `.env.example` ships with placeholder keys and comments
- No secrets, tokens, or credentials ever hard-coded, even temporarily "just to test"
- Passwords are always hashed with bcrypt before being stored — never stored, logged, or returned in plain text, even in error messages
- Every route that reads or writes `transcripts`, `action_items`, `jira_sync_log`, or `jira_connections` must filter by the signed-in user's `user_id` — no exceptions, no "admin" bypass

## 4. AI/LLM Usage Boundaries

- Transcript text sent to Gemini is treated as untrusted input — wrap it clearly in the prompt (e.g. a delimited block) so any instruction-like text inside a transcript can't be mistaken for a developer instruction to the model
- Model output only ever populates the Review & Edit screen — it never directly triggers a Jira ticket or Slack draft send without explicit human approval
- Keep prompts and their JSON schema centralized in `lib/prompts/extraction.ts` — don't scatter prompt strings across the codebase

## 5. Boundaries for Claude Code (the build agent)

- **Never edit `prd.md`, `architecture.md`, `rules.md`, `phases.md`, or `design.md` directly** — these are maintained in a separate planning conversation. If something in the codebase conflicts with what's written there, flag it clearly in your response instead of editing the file yourself.
- Don't add a new npm package without flagging it first — check it against the "Avoid" list above before installing
- Don't invent new database tables/fields without also updating `architecture.md` to match
- Don't restructure the folder layout defined in `architecture.md` without discussing it first
- If a task is ambiguous or underspecified, leave a clear `// TODO:` comment and flag it — don't silently guess and ship a stub
- Match the file/folder structure and naming already defined in `architecture.md`
- The connector picker (Jira/Asana/Linear) should not stub out fake Asana/Linear API logic — those two are visual placeholders only ("Coming soon," disabled), not partially-implemented integrations

## 6. Testing (assumption — flag if you want this changed)
- No full automated test suite required for v1, given this is a portfolio project on a tight build timeline
- If you'd like basic tests (e.g. Vitest for the extraction-parsing logic), say so and it'll be added here as a requirement
