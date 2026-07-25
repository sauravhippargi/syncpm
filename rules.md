# SyncPM — Rules & Conventions

## 1. Tech Stack: Use vs. Avoid

### Use
- Next.js (App Router) + TypeScript — strict mode, no `any` unless justified with a comment
- Tailwind CSS for all styling — no CSS-in-JS libraries, no standalone `.css` files unless global
- Prisma as the only ORM — no raw SQL unless Prisma genuinely can't express the query
- Supabase Postgres as the only database — no local SQLite, no mixing databases
- Google Gemini API as the only LLM provider — no fallback to OpenAI/Anthropic/Groq unless this doc is updated
- Jira Cloud REST API v3 with Basic Auth (API token) — no OAuth 2.0 in v1
- Vercel for hosting — no other deploy targets

### Avoid
- No paid APIs or services of any kind — every external call must be verifiably free-tier
- No state management libraries (Redux, Zustand, etc.) — React state + Server Components/URL state is enough for this app's scope
- No auth libraries (Clerk, NextAuth, etc.) — this is single-user, no login screen in v1
- No browser storage (`localStorage`/`sessionStorage`) — all persistence goes through Postgres
- No unnecessary abstraction layers (repository pattern, DI frameworks, etc.) — keep it direct and readable; this needs to be walked through in an interview, not maintained by a large team

## 2. Error Handling

- **Gemini calls** — wrap in try/catch; on `429`, retry up to 3x with exponential backoff (1s → 2s → 4s); on final failure, show a clear in-app error ("Extraction failed — try again") instead of a silent blank screen
- **Gemini output validation** — always validate returned JSON against the expected schema before saving; if it doesn't match, don't silently coerce it — show the raw output and let the user manually add action items instead
- **Jira sync** — every attempt (success or failure) is logged in `jira_sync_log`; failures should surface the actual Jira error message in the UI, not a generic "something went wrong"
- **File upload** — validate file type (`.txt`, `.vtt`, `.srt`) and cap size (e.g. 2MB) before accepting a transcript
- Every API route returns a consistent error shape: `{ error: string, code?: string }` — never throw raw exceptions to the client

## 3. Security & Secrets

- Jira API token and Gemini API key live only in server-side environment variables — never exposed in client-side code
- `.env` is gitignored; `.env.example` ships with placeholder keys and comments
- No secrets, tokens, or credentials ever hard-coded, even temporarily "just to test"

## 4. AI/LLM Usage Boundaries

- Transcript text sent to Gemini is treated as untrusted input — wrap it clearly in the prompt (e.g. a delimited block) so any instruction-like text inside a transcript can't be mistaken for a developer instruction to the model
- Model output only ever populates the Review & Edit screen — it never directly triggers a Jira ticket or Slack draft send without explicit human approval
- Keep prompts and their JSON schema centralized in `lib/prompts/extraction.ts` — don't scatter prompt strings across the codebase

## 5. Boundaries for Claude Code (the build agent)

- Don't add a new npm package without flagging it first — check it against the "Avoid" list above before installing
- Don't invent new database tables/fields without also updating `architecture.md` to match
- Don't restructure the folder layout defined in `architecture.md` without discussing it first
- If a task is ambiguous or underspecified, leave a clear `// TODO:` comment and flag it — don't silently guess and ship a stub
- Match the file/folder structure and naming already defined in `architecture.md`

## 6. Testing (assumption — flag if you want this changed)
- No full automated test suite required for v1, given this is a portfolio project on a tight build timeline
- If you'd like basic tests (e.g. Vitest for the extraction-parsing logic), say so and it'll be added here as a requirement
