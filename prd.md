# SyncPM — Product Requirements Document (PRD)

## 1. Overview
SyncPM is an AI-powered tool for Program Managers that turns cross-functional meeting transcripts into tracked action items, assigned owners, flagged blockers, real Jira tickets, and drafted Slack follow-up messages — plus a dashboard overview. It's built primarily as a **portfolio project** to demonstrate the ability to design and ship an end-to-end AI product: LLM-based extraction, genuine third-party API integrations (Jira, Fathom), and a clean, reviewable human-in-the-loop workflow.

## 2. Problem Statement
PMs run many cross-functional meetings. Action items get buried in notes, owners aren't always clear, blockers surface verbally but never get tracked, and manually creating Jira tickets, sending follow-ups, and compiling a weekly status report eats hours every week.

## 3. Target User
- **Primary (v1):** Any Program Manager who creates an account — each user's transcripts, action items, and Jira connection are private to them.
- **Secondary audience:** Interviewers/hiring managers evaluating your ability to build a real, working AI-powered tool with genuine API integrations — they can sign up with their own account, connect their own Jira, and try it live.
- Each user connects their own Jira Cloud site via OAuth, and optionally their own Fathom account via API key — there is no shared workspace or shared meeting source. The account owner's own "Acme Tech" Jira site and personal Fathom account are just their own connections, made through the same flow as anyone else.

## 4. Goals (v1)
- Demonstrate a full AI pipeline: raw transcript → structured, useful output
- Demonstrate genuine third-party API integrations (Jira Cloud REST API, Fathom API) — not mocked
- Show a thoughtful human-in-the-loop UX: nothing gets created or sent without review
- Support real, secure multi-user accounts — each PM's data is private to their account
- (Secondary) Actually save time on your own PM workflow

## 5. Non-Goals (v1)
- No live Zoom/Google Meet integration — transcripts from these are still uploaded manually; they remain visual "Coming soon" placeholders on the Upload screen (Fathom, previously grouped with these two, now has a real integration — see 6.1)
- No live Slack API integration — v1 only *drafts* the message; sending is manual copy/paste
- No Asana or Linear functionality — shown in the connector picker as "Coming soon" placeholders to signal the extensible design, but not functional
- No support for connecting more than one Jira site per user in v1
- No support for connecting more than one Fathom account per user in v1
- No epic assignment on created tickets — differs by Jira project type (team-managed vs. company-managed use different underlying fields) and is deferred until assignee/priority are proven out
- No password reset or email verification flow — can be added later if the tool grows beyond a portfolio demo
- No paid APIs — AI extraction runs on a free-tier cloud LLM (Gemini), auth uses a free, self-hosted library (no Clerk/Auth0), Jira OAuth app registration is free, Fathom API access is free

## 6. Core Features

### 6.0 Authentication & Accounts
- Combined landing + sign in/sign up page at the root route — a full scrollable marketing page, not just a compact auth screen, since the auth form is one component within it rather than the whole page
- Structure: sticky nav (logo only) → hero (headline, subheadline, "See how it works" anchor link, sign in/sign up card) → a "works with" logos strip → a 3-card features section → a closing CTA section → footer
- **Logos strip must stay accurate, not aspirational-as-if-real**: Jira and Fathom shown fully colored/live (both are genuine, working integrations). Asana, Linear, Zoom, and Google Meet may appear with the same "Coming soon" treatment already used in-app (muted, badged) — Slack and Notion do not appear at all, since Slack was deliberately generalized away from tool-specific naming elsewhere in the product, and Notion was never part of this build in any form
- The 3 features section replaces the old compact hero-panel bullet list with more room per point (icon + heading + paragraph): connecting a meeting recorder automatically, reviewing/approving extracted items, and shipping approved items to a real tracker — the ticket-creation point names **Jira specifically** (the one tool this is actually true for), not a list including tools that aren't real yet
- Email + password accounts (hashed, never stored in plain text)
- Every other feature below requires being signed in — unauthenticated visitors are redirected here
- Each user's transcripts, action items, and history are private to their account

### 6.1 Transcript Ingestion
- Manual upload of a meeting transcript file (`.txt`, `.vtt`, `.srt`) — still fully supported, unchanged
- Basic normalization: clean up speaker labels, strip unneeded timestamp noise, prep text for the AI pass
- If the optional meeting title is left blank (paste or file upload, either path), default to a title that includes the date, hour, and minute of upload (no seconds) — e.g. "Meeting — Jul 25, 2026, 3:42 PM" — rather than a generic "Untitled meeting" with no way to tell entries apart at a glance
- **Real Fathom integration:** connecting Fathom (pasting a personal API key, generated from the user's own Fathom account) fully automates ingestion — every new Fathom meeting is imported and run through extraction automatically, with no manual upload step and no button to click per meeting. This is the one placeholder that became real (see Non-Goals for why Zoom and Google Meet did not)
- Zoom and Google Meet remain visual "Coming soon" placeholders above the manual upload area, alongside Fathom's now-functional "Connect" state — ordered Fathom, Zoom, Google Meet

### 6.1a Fathom Auto-Import (real integration)
- User connects by pasting a personal Fathom API key (with a link to where Fathom shows it in their own account settings) — no OAuth redirect needed, since Fathom API keys are already scoped per-user
- On connecting, SyncPM registers a webhook with Fathom for that user's account, requesting transcript, summary, and action-item data on every new meeting
- When a new Fathom meeting completes, the webhook fires, SyncPM pulls the transcript, and feeds it into the **same Gemini extraction pipeline used for manual uploads** — SyncPM's own extraction stays the source of truth rather than trusting Fathom's built-in action item detection
- The imported transcript then flows through the identical Review & Edit → Raise a ticket → Slack draft pipeline as a manually uploaded one — Fathom only changes how the transcript arrives, not anything downstream
- Transcript History shows which transcripts arrived via Fathom vs. manual upload
- Disconnecting removes the stored key and deletes the registered webhook on Fathom's side, so events stop arriving

### 6.2 AI Extraction Engine
- **Action item extraction** — pulls concrete tasks discussed in the meeting
- **Owner assignment** — matches each action item to the participant it was assigned to, based on names mentioned in context
- **Blocker/risk detection** — flags language indicating a dependency or blockage (e.g. "waiting on," "blocked by," "can't move until")
- Powered by Gemini (free tier)

### 6.2a Owner Evidence (citation for owner assignment)
- **Problem:** Owner assignment (6.2) is a bare model assertion with no supporting evidence. The reviewer sees a name and has no way to check where it came from — and a wrong owner isn't a display-only issue: it flows straight into the Jira ticket modal's assignee dropdown as a pre-filled default (6.4), where a reviewer who clicks past it creates a real ticket assigned to the wrong person. Owner is the one extracted field with a direct path to an external side effect, so it's the one that most warrants being checkable rather than trusted.
- **Note on origin:** this feature was originally motivated by an apparent owner-attribution bug found in eval testing. That bug turned out not to be real — it was a substring-collision defect in the eval harness's own item matching (documented in `evals/KNOWN-ISSUES.md` section 1), and the model was attributing owners correctly throughout. The feature is kept because its actual justification is stronger than the one it was built on: it's a reviewer-trust aid at the one point where extraction reaches a real third-party system, and it was the mechanism that exposed the harness bug in the first place (the field's output showed the model citing the correct person while the harness reported a different one).
- **What's added:** alongside `owner`, the model must output the exact transcript quote that justifies the assignment — the phrase that names or directly addresses the person, not a paraphrase. If it can't produce one, `owner` is set to null rather than guessed.
- **Where it's shown:** as a small supporting caption wherever `owner` itself is already editable — Review & Edit, the Action Items tab, and the Deadlines tab (all three already share `ActionItemFields` per 6.3a/6.8, so this rides along for free) — and specifically next to the assignee dropdown in the Raise a Ticket modal (6.4), since that's the one point where a wrong owner becomes a real external action.
- **Explicitly not:** a new approval gate, a blocking validation step, or any change to `is_approved`. This is a visibility aid a reviewer can glance at, not a new checkpoint — consistent with 6.3's "checked by default, low friction" review philosophy.

### 6.3 Review & Edit (Human-in-the-loop)
- After extraction, a draft screen shows all action items, assigned owners, and detected blockers, each with a checkbox — **checked by default**, since extraction is usually right and unchecking specific items is less friction than approving each one individually
- Everything is editable — reassign owners, fix wording, adjust status, permanently delete a wrongly-extracted item (a small trash icon per card — distinct from unchecking, which just defers approval rather than removing anything)
- **Blockers is a text field, not a checkbox** — "Blockers (optional)," describing *why* something is blocked. A non-empty value is what makes an item a blocker; there's no separate boolean to keep in sync with it.
- One page-level action button reads **"Save all"** when everything is checked, or **"Save selected"** the moment anything gets unchecked — saving marks the checked items approved (`is_approved`) and persists any edits. Unchecked items are left exactly as they are, not deleted — they can be revisited and saved later. Clicking Save navigates directly to the Action Items tab, since that's the natural next step once items are approved.
- Approved items appear in the **Action Items tab** (6.3a) — that's where "Raise a ticket" now lives, not here; this screen is purely extraction triage and editing
- The drafted Slack message (6.5, not yet built) will key off which items are approved for a given transcript, independent of the Action Items tab

### 6.3a Action Items Tab
- The master list of every approved action item, across every transcript, past and present — not scoped to a single meeting
- Each row shows the description, owner, **an editable due date field** (a real date input, not plain text — matches the Status dropdown's always-visible, saves-on-change pattern rather than requiring a click through to Review & Edit for a small date change), a blocker tag when applicable, which meeting it came from, and a **Status dropdown (Open/Done)** — editable right here, not only back on Review & Edit. This is the only place status is visible/changeable after an item leaves Review & Edit, and it's what the Dashboard's "Completed action items" count actually reflects.
- Row actions, in order: **Status** dropdown, **Raise a ticket** (opens the modal described in 6.4), **Draft message** (opens the modal described in 6.5, greyed out until the row has an owner), then edit and delete — the once-synced re-raise behavior is a separate open question being resolved independently, not addressed by this change
- **Clicking edit** opens that item's source transcript on Review & Edit — but only the item being edited is pre-checked; every other item on that transcript is unchecked, regardless of its own approval state. This is a targeted single-item edit, not a re-review of the whole transcript. If the user unchecks that one item without checking anything else, Save is disabled (nothing selected to save).
- This is the only place ticket creation *and* Slack message drafting happen — Review & Edit no longer has either per-item action
- **Two sections, not one flat list**: Open items always sit above a separate Done section — changing a row's Status to Done moves it down into that section immediately, and back up if reverted to Open. Open items keep first priority no matter how many items accumulate over time. The Done section is collapsed by default (just a count, e.g. "Completed (12)"), expandable on demand, so a long history of finished items never turns this page into an ever-growing scroll.

### 6.4 Raise a Ticket (action) — connector picker + real Jira integration
- Each row in the **Action Items tab** (6.3a) gets a **"Raise a ticket"** button — this used to live on Review & Edit; it's moved here now that approval and ticket creation are separate steps
- **Connected:** clicking it opens a small modal, not a page navigation — shows which tool it's targeting (e.g. "via Jira"), a **project** dropdown (pre-selected to the connection's default project, always overridable — not every action item necessarily belongs in the same Jira project), an **assignee** dropdown (real users from *whichever project is currently selected*, pre-selected to the closest name match against the extracted owner, always overridable — shown alongside the owner-evidence quote from 6.2a so the reviewer has something concrete to check the guess against, not just a bare name match), and a **priority** dropdown (pre-selected High if the item has a non-empty blocker note, Medium otherwise, always overridable). Changing the project reloads the assignee list to that project's actual members. "Create ticket" submits; "Cancel" closes without creating anything.
- **Not connected:** the same modal shows the connector picker instead of the fields — Jira (functional "Connect" button), Asana and Linear (logos shown, "Coming soon" badge, disabled). Connecting Jira leaves briefly for Atlassian's real OAuth consent screen (unavoidable — that's Atlassian's own page), then returns the user to this same action item's row with the modal reopened, ready to fill in assignee/priority — not dropped on the standalone tab described next.
- **Epic assignment is explicitly out of scope for this pass** — it depends on whether a Jira project is team-managed or company-managed (different underlying field), which is meaningfully more complex than assignee/priority and is being deferred rather than rushed in alongside them.
- A separate standalone **Tickets tab** (distinct from the Action Items tab, renamed from "Raise a ticket" since this tab is for connection management and history, not the act of raising a ticket itself) still exists for connection management (connect/disconnect, default project, recently created tickets) — the modal above handles per-item ticket creation, this tab handles managing the Jira connection itself
- Real issue creation via Jira REST API v3 — title, description (with meeting context), the chosen assignee and priority, due date if known
- Per-item status shown in the UI: not synced / synced / failed

### 6.5 Slack Message Drafting
- **Lives on the Action Items tab, as a per-row action** — not on Review & Edit. This is a change from how it was first built: drafting moved from "one grouped message per owner, per transcript" to **one message per individual action item**, matching how "Raise a ticket" already works on this same tab (both are per-row actions, not per-transcript batch actions)
- Clicking **"Draft message"** on a row opens a modal (same interaction pattern as the Raise a Ticket modal) showing an AI-drafted, professional, plain-language message about that one action item — its description, owner, due date, and blocker note if any
- **The message must reframe the task, not echo the extracted description verbatim as a question.** If an item's description carries the owner's own vague phrasing (e.g. "circle back to the pricing review," pulled from something they said themselves), quoting it back at them as "Could you circle back to the pricing review?" reads oddly — it's their own words handed back, not an actual follow-up. Frame it as a check-in on an already-known task ("Following up on the pricing review — any update?"), not a fresh request out of nowhere.
- Since an owner is guaranteed to exist (the button is disabled otherwise), **the message always opens with a personal greeting using the owner's name** (e.g. "Hi Priya,") — there's no reason for a generic, unaddressed opener when a name is always available
- **Modal and message copy must not presuppose a specific chat tool** — no "Slack" anywhere in the visible UI text or the drafted message itself, since a person could just as easily paste it into Teams or anywhere else. The modal subtitle reads "An AI-drafted message for this action item — edit before sending," not "...Slack message..."
- No emojis, no filler ("just checking in!", "hope you're doing well!") — direct and professional
- **Greyed out until an owner exists** — same principle as the earlier Unassigned handling, just applied per-row instead of per-group: an item with no owner can't sensibly get a personal message drafted for it, so the button is disabled until one is set
- **Editable, not read-only:** the modal's message renders in an editable textarea, consistent with every other AI output in the app getting a human review-and-edit step before use
- **If the item is already synced to Jira**, the message includes a closing line linking to the real ticket (e.g. "You can follow it here: [link]") — appended deterministically by the application using the real URL from `jira_sync_log`, not generated by Gemini, since a hallucinated or slightly-wrong ticket link is a worse failure than no link at all. Since messages regenerate fresh each time rather than being persisted, drafting before vs. after syncing naturally reflects whichever is true at that moment — no stale-link problem to design around.
- "Copy" copies whatever's currently in the textarea, including edits
- Displayed in-app for the PM to copy and send manually, in whatever tool they actually use — no live send integration in v1
- Nothing is persisted — closing and reopening regenerates fresh

### 6.6 Dashboard (Home)
- The default screen after signing in — replaces a blank upload form as the landing experience, so the app feels alive on login rather than starting from zero every time
- Persistent sidebar (logo, Dashboard, Upload transcript, Transcript history, Action items, Tickets, Deadlines, **How to use**, signed-in user + sign out) wraps every authenticated page
- **How to use** sits at the bottom of the main nav list, just above the divider that separates it from the account footer (email + sign out) — an info-circle icon, not a route (clicking it opens a modal, doesn't navigate, so it never shows an "active" nav state). The modal is a short, static reference walkthrough of the whole product flow (add a meeting → review & approve → act on it in Action Items → track deadlines/history) — useful for anyone unfamiliar clicking through the app, interviewer or otherwise, without needing a tour library or onboarding flow.
- Four stat cards, not three: **Open action items** (clicking it navigates to the Action Items tab), **Blockers**, **Completed action items** (`status = done`), and **Tickets raised** (renamed from "Synced to Jira" — generic, since Jira is one of several connectable tools). Blockers and Completed are both kept — blocker detection is a headline feature of the product and isn't worth demoting to add a progress metric, so the fourth stat slot covers that instead. **All four counts are scoped to `is_approved = true` only** — the same scope the Action Items tab itself uses — so a stat card's number always matches what's actually visible in that tab; an item edited on Review & Edit but never saved/approved shouldn't count toward any of these.
- A **Recent transcripts** list (last 5, each showing action item count, blocker count, and upload timestamp, linking into its Review screen) side by side with an **Upcoming deadlines** preview (top 10 open items by due date, **`is_approved = true` only** — same scoping rule as the four stat cards, so a transcript sitting unreviewed on Review & Edit never shows deadline rows here until the user actually saves/approves it) — the two lists are sized to read as roughly balanced columns rather than one being a single card dwarfed by a long list
- **Empty state (no transcripts yet):** the welcome message and two side-by-side options — **Connect Fathom** (marked "Recommended," primary button, since automatic import is the higher-value path) and **Upload a transcript** (secondary, equally functional) — sit on top of a blurred, dimmed preview of the real populated layout (the four stat cards and the Recent Transcripts/Upcoming Deadlines columns, filled with representative sample content) rather than a bare empty page, so a first-time user gets a sense of what the product looks like in use, not just a blank canvas. Below both option cards, a compact 3-step preview of the whole workflow ("Add a meeting → Review & approve → Raise a ticket or draft Slack") gives a first-time user the shape of the product before they've done anything.
- No descriptive subheader under the page title — this applies app-wide (every page's title stands alone, no explanatory tagline underneath it), not just here

### 6.7 Transcript History
- List of all previously uploaded transcripts (filename, meeting title/date if available, upload timestamp)
- Clicking into one reopens its extracted action items, owners, blockers, and current Jira sync status
- Each transcript can be deleted from this view, with a confirmation step first — deleting removes the transcript and its action items from SyncPM only; any tickets already created in Jira are untouched
- If Fathom is connected, a **"Sync recent meetings"** button (kept tool-agnostic, matching the "Raise a ticket" naming pattern, since other source connectors may become real later) checks for any meetings from the last 30 days that the webhook missed (e.g. recorded before connecting, or a delivery that failed) and imports them — a manual backup path alongside the automatic webhook, not a replacement for it

### 6.8 Deadlines Tab
- Cross-meeting view of all open action items with a due date, **scoped to `is_approved = true`** — same rule as the Dashboard's stat cards and preview, and the Action Items tab; an item still sitting unreviewed on Review & Edit doesn't appear here
- **Two sections, not one flat list: Missed Deadlines, then Upcoming Deadlines below it.** An item is "missed" if its due date is strictly before today — something due today itself still counts as upcoming, not missed. The Missed section only renders at all if at least one item qualifies.
- **Within each section, items are grouped under a date header** (e.g. "July 27, 2026"), with every item due that day listed beneath it — not a flat chronological list. Since the date is already established by the group header, individual rows no longer repeat their due date next to the description (that would be redundant); the row's due date only appears once, in the header above it.
- Complements the Dashboard's deadlines preview (6.6), which only shows a short list — this is the full, filterable view
- **Due date is also editable here**, not just on Action Items — a compact inline date control per row (smaller than the group header, since the header already establishes the date for scanning; this one exists specifically to change it). Changing it moves the item to the correct date group immediately — a new group if none exists yet for that date, or into/out of Missed Deadlines if the new date crosses today — the same live-regroup behavior already used for Status/Done on Action Items, no page refresh needed.
- **Owner and Status are editable here too, for the same reason** — Deadlines, Action Items, and Review & Edit all use the same shared fields component (owner, due date, status, blockers), so there's exactly one implementation of "editing a field" rather than three independently-built versions that drift out of sync with each other. Changing Status to Done here regroups/updates the same way it would from Action Items. What stays intentionally different across the three surfaces is the workflow-stage actions (bulk approve only on Review & Edit; Raise a ticket/Draft message only on Action Items) — those are deliberately scoped to where they make sense in the flow, not an oversight.
- **Two distinct empty states, not one** — the page needs to tell apart *why* it's empty:
  - **No approved action items exist at all** (across every transcript): "No action items yet — upload a transcript to start tracking deadlines," with an "Upload a transcript" button
  - **Approved action items exist, but none have a due date set**: a different message — "Your action items don't have due dates yet — add one to start tracking deadlines here," with a "Go to Action items" button instead. Uploading another transcript doesn't fix this case; the real fix is adding due dates to what already exists.

## 7. Success Metrics
- **Portfolio/demo:** A live, working demo where a Fathom meeting auto-imports and a real Jira ticket comes out the other end — verifiable end to end with no manual steps in between
- **Functional:** Time saved vs. manual note-taking + ticket creation + follow-ups
- **Quality:** % of meetings where action items are accurately captured and owners correctly assigned

## 8. Open Questions
- How due dates get inferred when not explicitly stated in the transcript
- **Partially resolved:** fallback behavior when owner matching fails (nicknames, unclear pronouns, etc.) — 6.2a's owner-evidence quote gives the reviewer a concrete way to check a match before it reaches Jira, and extraction now refuses to assert an owner it can't cite a supporting quote for (null instead of a guess). What remains genuinely open is the *Jira-side* name match: mapping an extracted name onto a real Atlassian account is still best-effort substring matching (see `architecture.md`, Assignee resolution), and nicknames or duplicate first names can still pre-select the wrong account. Extraction-side owner attribution itself measured 5/5 across all fixtures once a defect in the eval harness's own matching was fixed.
- Whether Asana/Linear become real integrations later, or stay as "Coming soon" indefinitely
- Whether password reset/email verification gets added later, or stays out of scope permanently
- **Parked, not decided:** how to handle short/interrupted Fathom meetings (e.g. someone removes the bot a few minutes into a sensitive call) without relying on the user having configured Fathom's own join-behavior settings, since most people leave defaults alone. Leading idea discussed: duration-based auto-flagging (very short meetings land in a "Needs review" state, showing only title/timestamp/duration — not transcript content — with Process/Discard actions, so nothing gets sent to Gemini until confirmed) plus an optional "always review before processing" setting. Not built, needs more thought.

**Resolved:** Jira uses OAuth 2.0 (per-user, no shared credentials) · Fathom uses per-user API keys + webhooks, verified via a webhook signing secret (HMAC, `webhook-id`/`webhook-timestamp`/`webhook-signature` headers) — no OAuth needed for a non-marketplace integration · LLM is Gemini · Auth uses Auth.js (Credentials provider), not Clerk/Auth0
