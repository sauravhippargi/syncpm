# Eval Harness — Known Issues

Extraction and harness problems the suite has surfaced. Recorded so a red suite
is never mistaken for a broken harness, so nobody "fixes" a failing check by
loosening a fixture that is actually correct — and, after section 1, so nobody
trusts a fixture verdict that was never actually measuring the model.

**Standing lesson from section 1:** verify a claim about model behavior against
recorded item dumps (`EVAL_DUMP_ITEMS=1`), never by reasoning from the fixture
file. Every wrong conclusion below came from inferring what the model did from
what the fixture reported.

---

## 1. `full-qa-pass` owner attribution — RESOLVED (was never a model bug)

**Fixture:** `evals/cases/engineering-sprint-sync.json` → `full-qa-pass`
**Reported symptom:** owner scored as **"Kim Osei"** instead of **"Sam Torres"**.
**Actual cause:** a substring identity-match collision in the harness
(section 2). The model was attributing the task to Sam Torres correctly; the
fixture was reading a different extracted row and reporting *its* owner.

`full-qa-pass` matched on `descriptionContains: ["qa"]`, and the wire-up item's
description routinely ends "…ready for QA". Two items matched; `findMatch` was
`items.find(...)`, first-match-wins; the wire-up row sorts earlier. So the
check compared Kim Osei — the wire-up item's correct owner — against an
expectation written for the QA row.

### How it was proven

An `EVAL_DUMP_ITEMS=1` run showed the model returning, in the same trial the
harness scored as a failure:

> 5. Run a full QA pass on the notifications feature.
>    owner: **Sam Torres**
>    ownerEvidence: *"Sam, once Kim's UI is ready Thursday, can you run a full QA pass before we cut the release Friday morning?"*

Correct owner, cited to the exact cue-9 vocative this section previously
believed the model could not bind. Replaying the old `["qa"]` keyword against
that recorded output reproduces the ambiguity and returns the wire-up row.

### The measured-history table was measuring the harness

The table previously here recorded 0/5, 4/4, 0/6, 0/5, 0/4 across five prompt
states and concluded the model was unstable. **Those numbers are not evidence
about the model** and have been removed rather than corrected — every one of
them was produced by the collision, so they describe which description the
model happened to generate for the *wire-up* item, not how it attributed the QA
task. The lone 4/4 was most likely a run where the wire-up description omitted
"QA", breaking the collision, and was dismissed at the time as noise. It was
the only honest row in the table.

Nothing about the four "failed" prompt iterations is safely interpretable, in
either direction. They are not evidence that instruction-space is exhausted,
and they are not evidence that any of those prompt changes helped.

### Verified after the fix

With unique keywords `["qa", "pass"]`, owner is **5/5** with the evidence
prompt and **5/5** without it (section 1a). Zero `AMBIGUOUS_MATCH`, zero
collisions.

---

## 1a. Disentangling experiment — ruling out the `ownerEvidence` prompt

Two things changed between the historical failures and the first green run: the
collision was removed **and** the prompt gained the `ownerEvidence` field plus
three worked-example evidence lines. Either could have produced the 5/5, and
they write up as opposite conclusions, so they were separated deliberately.

**Setup:** `lib/prompts/extraction.ts` reverted to its pre-`ownerEvidence`
state (schema property, field-list bullet, and three worked-example lines all
removed), with the *fixed* fixture keywords and the ambiguity/mirror-case
detection left in place. `ownerEvidenceExpected: false` on the engineering
expectations so the absent field wouldn't fail every check. One variable.

**Result: 5/5 on every tracked check**, including `full-qa-pass` owner — suite
100%, zero ambiguity, zero collisions. The `ownerEvidence` prompt is ruled out
as the cause. The collision was the whole story; the evidence field exposed the
harness bug rather than fixing an attribution bug.

Replaying the old `["qa"]` keyword against *that* run's dumps — the
pre-evidence prompt, the same prompt state that historically scored 0/n — still
returns the wire-up row (Kim Osei) while the model assigned Sam Torres. That is
the reported failure reproduced end to end with the prompt change excluded.

**Required deviation, recorded for validity.** Removing the schema property
alone is not a clean revert: `validateExtractionResult` drops any owner lacking
a supporting quote, so with no quote ever returned it nulls **every** owner and
yields a mechanical `owner 0/5` — indistinguishable in the report from "the
evidence field is doing the work," i.e. the exact opposite conclusion. The
validation coupling was therefore reverted to pre-feature behavior for the run
as well. Both files were restored from backup afterward and verified
byte-identical.

**Scope limit.** This shows the mechanism reproduces under the old prompt
*today*. The historical runs' descriptions were never recorded, so those
specific rows cannot be re-examined. What is established is that the reported
failure never required a real attribution error to occur.

---

## 1b. Knock-on: the `full-qa-pass` blocker check was also never measured

Confirmed against both recorded dumps, replaying old first-match-wins
semantics: `full-qa-pass` `["qa"]` and `wire-up-ui` `["ui", "wire"]` resolved to
the **same extracted row** — the wire-up item — in every dump on file. Two
expectations, one row, both reading that row's `blockerNote`.

That explains their perfect lockstep across prompt states (3/5 → 0/4 → 6/6 →
6/6): they were not two checks agreeing, they were one check reported twice.

Consequences:

- v2's counter-example fixed **one** false-positive blocker, not two. The
  wire-up item's spurious blocker was real and really fixed.
- `full-qa-pass`'s own blocker status was **never measured** until the keywords
  were corrected. Its current 5/5 (both prompt states) is the first real
  measurement of it.

Same scope limit as 1a: confirmed on the dumps that exist, both from the same
day. The historical lockstep is strong corroboration but those rows weren't
recorded.

---

## 1c. What still stands

Not everything in the old record was an artifact. Stated explicitly so the
correction above isn't over-applied:

- **`escalate-twilio` blocker routing is a real fix, independently verified.**
  Its keywords `["twilio", "escalate"]` resolve uniquely — no collision was
  ever possible — and it held **5/5 in the pre-evidence run**, i.e. under the
  prompt state that predates every change made during this investigation. The
  worked-example technique genuinely fixed it.
- The owner-attribution *rule* in the prompt (addressee outranks other names in
  the sentence) caused zero measured regressions and is defensible guidance on
  its own terms. It is kept. What is now unsupported is the claim that it was
  *tested and failed* — that test was reading the wrong row.

---

## 1d. Unconfirmed observation — date precision under the evidence prompt

`accessibility-audit` (optional item, must not get a hallucinated date) picked
up a spurious due date in **2/5** trials with the evidence prompt and **0/5**
without it.

**This is not a finding and has not been acted on.** n=10 total, one fixture,
one optional item, two different days — well inside noise for a check that has
been intermittent since the harness was built. Recorded only so it isn't
rediscovered as new, and so any claim that the Owner Evidence feature is
precision-neutral gets a confirmation run first rather than being assumed.

---

## 2. Substring identity-match collisions in the harness — FIXED (detection), FIXTURES PARTLY UNVERIFIED

**Scope:** `evals/scoring.ts` matching, not the model.

A fixture identifies which extracted item an expectation refers to via
`descriptionContains` substring keywords. `findMatch` used to be
`items.find(...)` — **first match wins** — so a keyword set that hit more than
one extracted item silently scored whichever happened to come first in the
array. That fails in both directions, and both were observed live on
`engineering-sprint-sync`:

- **False failure.** `full-qa-pass` used `["qa"]`. The wire-up item's
  description ended "…and prepare it for QA", sits earlier in the array, and
  was scored instead — reporting `owner: expected "Sam Torres", got
  "Kim Osei"` in a run where the QA item was extracted with owner **Sam
  Torres** and the correct cue-9 vocative as its `ownerEvidence`.
- **False pass.** `fix-duplicate-notification-bug` used `["notification"]` and
  resolved to the *endpoint* item, which happens to share owner Jordan Patel.
  It reported fully-correct while measuring the wrong item entirely; the real
  bug-fix item was matched by no expectation at all.

### The `fix-duplicate-notification-bug` record was backwards

Commit `415977d` lists this item under FIXES — "5/5 clean. Fixture keyword
correction" — and changed `["duplicate", "notification"]` → `["notification"]`.
**That edit introduced the collision proneness rather than fixing anything, and
the 5/5 that appeared to validate it was a false pass.**

Both keyword sets were wrong, in opposite directions:

- `["duplicate", "notification"]` — a genuine false *not-found*. The model
  describes this task as notifications "sent **twice**"; "duplicate" appears
  only in the transcript's recap line, so the item was usually missed entirely.
  Diagnosing that as too-strict was correct.
- `["notification"]` — the overcorrection. It made the expectation match the
  first item mentioning notifications, which on many runs is the endpoint item.
  Sharing owner Jordan Patel and a due date with the real target, it satisfied
  every check while measuring the wrong row.

So the "0/5 → 5/5 fixed" transition recorded in that commit measured a keyword
change turning a miss into a mismatch, not the model improving.

Now `["notification", "bug"]`, verified unique against real extracted output in
both prompt states rather than reasoned from the fixture.

**This collision is intermittent, which is what makes it dangerous.** On a
later run the endpoint item came back as "Have the endpoint ready for Kim" —
no "notification" — so the old keyword resolved correctly and the check would
have looked fine. Same fixture, same prompt, different phrasing: a false pass
that appears and disappears run to run. That is the argument for keeping the
mirror-case detection permanently rather than relying on spot checks.

**Fixed at the root:** `findMatch` now resolves only on a *unique* hit and
reports `AMBIGUOUS_MATCH` otherwise, listing every colliding description.
`runTrial` additionally detects the mirror case — two expectations resolving to
the same extracted item — which the per-expectation check cannot see. Both are
hard failures. Identity matching is no longer decided by array order.

Keywords tightened (identity matching only; **no expected values changed**):
`full-qa-pass` `["qa"]` → `["qa", "pass"]`, and
`fix-duplicate-notification-bug` `["notification"]` → `["notification", "bug"]`.
(`["duplicate"]` was rejected: the extracted description reads "sent **twice**",
so it would have produced a false not-found. Only the transcript's recap line
uses "duplicate".)

### Retroactively suspicious — UNVERIFIED

`prepare-patch` in `customer-escalation-call.json` uses the single generic
keyword `["patch"]`. Section 1 above records an earlier `prepare-patch`
mismatch as a *genuine fixture bug, since fixed* — attributed at the time to
keyword strictness. **That diagnosis is now suspect:** it has exactly the shape
of this collision class. `find-infra-oncall` is the task that unblocks Chris's
patch, so its description plausibly contains the word "patch" too, in which
case `["patch"]` would have matched both and scored the wrong one.

**This is a suspicion, not a finding.** Nothing has been re-run to confirm it,
and the descriptions from those historical runs were never recorded, so the
question may be permanently unanswerable. Recorded so the earlier "fixed"
verdict isn't treated as settled. `legal-heads-up` `["legal"]` carries the same
single-generic-keyword risk, lower.

Neither was changed: verifying a tightened keyword set requires real extracted
descriptions for that fixture, and guessing blind trades a silent false pass
for a false not-found. The new `AMBIGUOUS_MATCH` check will now fail loudly on
either if it ever collides, which is the safe state to leave them in.

---

## 3. `owner_evidence` lost on an owner revert — WON'T FIX (now data-only)

**Scope:** stored data only (`app/api/action-items/[id]/route.ts`). Not an
extraction problem, so the eval suite does not cover it — recorded here because
this is where the project's accepted-limitation list lives.

Editing an owner clears `owner_evidence` in the PATCH route, since a quote never
supports a name the model didn't pick.

**The gap:** change an owner and then change it *back* to the original name, and
the row keeps that owner with `owner_evidence` permanently null. The first edit
destroyed the quote; nothing repopulates it. The row is now indistinguishable
from one whose owner was typed in from scratch.

**No longer user-visible.** This section previously described a caption that
briefly reappeared client-side while the stored quote was already gone. Owner
Evidence is deliberately non-visual now (prd.md 6.2a) — the caption, the pill,
and the ticket-modal evidence box were all removed as clutter — so there is no
display to be inconsistent with. The remaining effect is entirely in the
database: a recoverable quote is discarded, and no user ever sees the
difference.

**Still a deliberate decision not to fix.** Closing it means keeping the cleared
quote server-side to re-attach on an exact revert — real machinery to preserve a
value nothing currently reads (see the note in section 2 of this file's
companion analysis: `owner_evidence` has no read path in the app today). The
invariant that matters still holds: no row ever carries a quote under an owner
that quote doesn't name. Losing a quote is the safe direction to fail.

**Observed in real data.** On the first production upload, the accessibility-audit
item ended up with owner "Kim Osei" and `owner_evidence` null — the state this
section describes, most likely produced by clearing the owner during a UI test
and typing it back. Worth knowing when reading the table directly: an
owner-without-quote row does not imply extraction failed to cite one.

---

## 4. Eval quota is shared with production — MITIGATED, NOT SOLVED

`evals/run.ts` currently runs on the same `GEMINI_API_KEY` as production, so
eval trials and real user traffic draw from one free-tier budget of **20
requests/day per project per model**. A full 4-fixture × 3-trial suite is 12
calls — 60% of a day.

`lib/gemini.ts` accepts an `apiKeyOverride` parameter and `.env.example`
documents `GEMINI_API_KEY_EVAL` so evals can be isolated onto their own key.
That is currently blocked: a newly-created Google project **cannot invoke
`gemini-2.5-flash` at all** (404, "no longer available to new users") — only
older, grandfathered projects can. Pointing evals at a model production does
not use would defeat the harness's purpose, so the plumbing is in place and
unused pending real entitlement on a second project (likely via enabling
billing there).
