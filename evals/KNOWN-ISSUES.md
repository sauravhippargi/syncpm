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
(section 3). The model was attributing the task to Sam Torres correctly; the
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

## 1a. Disentangling experiment — `ownerEvidence` ruled out for the attribution bug ONLY

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

**Second scope limit — this experiment did NOT clear `ownerEvidence` generally.**
It answered one question: was `ownerEvidence` the reason `full-qa-pass` owner
started passing? No — the collision fix was. That conclusion stands.

But the setup cannot speak to anything beyond it, for two reasons. It reverted
the *entire* pre-`ownerEvidence` prompt (schema property, field bullet, and three
worked-example lines together), so it never isolated `ownerEvidence` from
anything. And it measured only `engineering-sprint-sync`, where **every expected
item has an explicit named owner** — a fixture that structurally cannot detect a
failure specific to items with no agent at all. `discussion-heavy-planning`, the
fixture built to ask that question, did not exist yet.

**Do not read this section as having already tested the leading suspect in
section 2.** `ownerEvidence` as a cause of *agentless recall suppression* is a
different hypothesis, untested, and currently the most likely explanation for the
regression documented there. Ruling it out for the phantom attribution bug is not
ruling it out for this.

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
  the sentence) caused zero measured regressions. It was **retained** here as
  defensible guidance on its own terms — and has since been **removed and
  measured** rather than assumed (see section 2). Removing it leaves
  `full-qa-pass` owner at **5/5** on engineering-sprint-sync at n=5, along with
  every other check on that fixture. That check was the rule's entire
  justification, so this is direct confirmation of what this section concluded
  by inference: there was no real attribution bug for the rule to prevent.
  Removing it also improved soft-assignment recall elsewhere. What remains
  unsupported is the earlier claim that the rule was *tested and failed* — that
  test was reading the wrong row.

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

## 2. Soft-assignment recall — PARTIALLY FIXED, ONE TARGET STILL BROKEN

**Scope:** the prompt (`lib/prompts/extraction.ts`), not the harness.

**The regression.** A real Fathom-imported transcript — "PMM Team Weekly Call", a
73-line single-speaker monologue — extracted **2** action items under the
pre-`415977d` prompt and **0** under the current one. Same model, same
`temperature: 0`, same day, prompt file the only variable. Both items the older
prompt found were genuine tasks, and both had `owner: null`. My first diagnosis
of that transcript — "correct behavior on a task-free monologue" — was wrong; it
was wrong under the current prompt only.

**Why the suite couldn't see it.** All four original fixtures are
explicit-assignment meetings, and `casual-team-catchup-vague` actively rewards
restraint. A prompt tuned to recognize only named hand-offs therefore scores
100% on the suite while under-extracting badly on discussion-heavy input.
`discussion-heavy-planning` exists to detect exactly this: one dominant speaker,
almost no vocative hand-offs, three expected items legitimately unassigned.

### Variant table — `discussion-heavy-planning`, found · fully-correct

| configuration | define-mid-market | legal-turnaround | other three |
|---|---|---|---|
| baseline, current prompt (n=3) | 1/3 · 1/3 | 1/3 · 0/3 | 3/3 · 3/3 |
| whole rule block removed (n=3) | 2/3 · 0/3 | 2/3 · 2/3 | 3/3 · 3/3 |
| owner reasoning removed + blocker guard reworded (n=5) | 0/5 · 0/5 | 4/5 · 4/5 | 5/5 · 5/5 |
| **owner reasoning removed, blocker bullet verbatim (n=5) — SHIPPED** | **0/5 · 0/5** | **5/5 · 5/5** | **5/5 · 5/5** |

The third row was not a clean single variable (a subtraction plus a reworded
blocker guard); the fourth is, and reproduces the same `define-mid-market` 0/5,
which retracts the theory that the reword was what suppressed it.

### Re-measured on the real transcript after v3 shipped — still 0

The PMM transcript was re-run against the committed v3 prompt (`a8fbfde`), same
bytes as the original measurement, n=1: **still 0 items.** So removing the
owner-attribution reasoning does **not** fix the regression this section is about.
v3's gain was real but narrower than the regression it was chasing.

| prompt state | PMM items |
|---|---|
| pre-`415977d` | 2 (both `owner: null`) |
| current, pre-v3 | 0 |
| committed v3 (`a8fbfde`) | **0** |

Both pre-regression items were **agentless**, which is what makes this coherent
rather than contradictory:

- *"we need to get commitment from the campaign managers"* — no actor named
- *"I think we should take the 14.0 items and add more"* — first-person plural, no
  individual attaching themselves

Neither has anyone saying "I'll do it" or being addressed by name. Both are the
same shape as `define-mid-market`, which is 0/5 under v3. So **the real transcript
and the fixture now agree on the same boundary**, from independent inputs.

*n=1 limit:* justified by v3's zero output variance across five trials on both
fixtures, but a single trial cannot distinguish a stable 0 from a rare 0. A second
trial is worth one call only if a future variant *also* returns 0 — if a variant
returns non-zero, the asymmetry doesn't matter.

### The finding: agentive vs. agentless phrasing

Recall was **recoverable** for *"somebody needs to sit down with legal"* — an
unassigned task that still names an indefinite agent. It was **not recoverable**
for *"that probably needs to get nailed down"* — agentless passive, no actor
named or implied. Removing the owner reasoning took the first from 1/3 to 5/5 and
left the second at 0/5 across two independent n=5 runs, and leaves the real PMM
transcript at 0. Whatever suppresses the agentless form lives elsewhere in the
prompt.

### Coverage risk — `define-mid-market` is the only committable agentless case

`define-mid-market` is currently the **entire** suite's coverage of this failure
mode. The transcript that actually demonstrates the regression cannot be committed
— it's third-party YouTube content — so the fixture item is the only version of
this test that lives in the repo.

That makes it load-bearing out of proportion to its size. If it were ever removed,
or loosened to pass, **the suite would lose all coverage of agentless recall and
this regression would become undetectable again** — the exact situation that let
it ship in the first place.

It is also the most-failing expectation in the suite (0/5 in two configurations),
which is precisely the kind of item that attracts pressure to soften. **The
correct response to doubts about it is to author a second, stronger agentless
item — not to delete or loosen this one.** Same standing rule as everywhere else
in this file: do not fix a failing check by weakening a fixture that is correct.

Also measured: output became **fully deterministic** once the rule was removed —
identical extractions across all 5 trials, where the baseline varied 3/3/5.

### Untested suspects — do NOT re-test the owner rule

Two additions remain unmeasured, and one of them is the likely cause of the
agentless failure:

1. **The three worked few-shot examples** — every one demonstrates explicit
   vocative assignment ("Name, can you take this on?").
2. **The `ownerEvidence` requirement** — demands a verbatim quote that names or
   directly addresses a person, which an agentless task cannot supply.

The owner-attribution rule has now been tested across four configurations and is
removed. **Do not spend quota re-testing it.**

### Validation gate for any further prompt change

Re-run `engineering-sprint-sync` at n=5 and confirm `escalate-twilio`
blocker/blockerNote and `full-qa-pass` owner both hold at 5/5. Those are the two
checks with real, independently-verified history (section 1c); everything else on
that fixture has held at 5/5 alongside them.

---

## 3. Substring identity-match collisions in the harness — FIXED (detection), FIXTURES PARTLY UNVERIFIED

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

## 4. `owner_evidence` lost on an owner revert — WON'T FIX (now data-only)

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
value nothing currently reads (see section 3: `owner_evidence` has no read path in the app today). The
invariant that matters still holds: no row ever carries a quote under an owner
that quote doesn't name. Losing a quote is the safe direction to fail.

**Observed in real data.** On the first production upload, the accessibility-audit
item ended up with owner "Kim Osei" and `owner_evidence` null — the state this
section describes, most likely produced by clearing the owner during a UI test
and typing it back. Worth knowing when reading the table directly: an
owner-without-quote row does not imply extraction failed to cite one.

---

## 5. Eval quota is shared with production — MITIGATED, NOT SOLVED

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
