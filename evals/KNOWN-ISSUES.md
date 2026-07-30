# Eval Harness — Known Unresolved Issues

Open extraction problems the eval suite reliably catches but that are **not yet
fixed**. Recorded here so a red suite is never mistaken for a broken harness,
and so nobody "fixes" a failing check by loosening a fixture that is actually
correct.

---

## 1. `full-qa-pass` owner attribution — UNRESOLVED

**Fixture:** `evals/cases/engineering-sprint-sync.json` → `full-qa-pass`
**Symptom:** owner extracts as **"Kim Osei"** instead of **"Sam Torres"**.

The transcript is unambiguous — Alex asks about QA, Sam accepts it directly
("Yep, I'll block off Thursday afternoon for that"), and Alex's own recap
confirms "Sam's doing full QA Thursday afternoon". Kim is the *previous*
speaker discussing the UI. So the model is attributing the task to a nearby
speaker rather than the person who accepts it.

**The fixture expectation is correct. Do not loosen it to make the suite pass.**

### Measured history (clean trials only, per prompt state)

| Prompt state | Result |
|---|---|
| v1 — reworded owner instructions | 0/5 |
| v1 — + owner-binding few-shot example | 4/4 |
| v2 — + resolved-dependency example | 0/6 |
| v3 — + open-escalation blocker example | 0/5 |
| v4 — + structural owner-attribution rule | 0/4 |

The lone 4/4 stands against **four** separate 0/n results and is most likely
noise, not a real fix. This is exactly why the harness reports a pass **rate**
over multiple trials rather than a single pass/fail — a one-run "fix" here
would have been a false positive.

### Root cause (confirmed by transcript read)

Cue 9 of `engineering-sprint-sync.vtt`:

> Alex Rivera: Great. **Sam,** *once Kim's UI is ready Thursday,* **can you run a full QA pass** before we cut the release Friday morning?

Sam is the addressee; Kim appears only inside a subordinate timing/possessive
clause. But Kim's name sits *textually closer* to "QA pass" than Sam's does.
The model is binding on proximity to the task keyword rather than on who is
being addressed.

### Why instruction-space is considered exhausted

Two distinct approaches have now failed:

1. **Few-shot examples** (v1–v3) — did not hold across runs.
2. **A structural rule** (v4) — an explicit procedural instruction stating
   that the addressee outranks every other name in the sentence, that the
   second-person pronoun resolves to the addressee, and that names inside
   timing/possessive/conditional clauses are never owners.

The v4 test was run under **maximally favorable, arguably invalid** conditions:
at the time, the rule's own illustrations used the fixture's literal wording —
a verbatim vocative example (`"Sam, can you run the QA pass?"`) and a verbatim
non-owner example (`"once Kim's UI is ready"`). The model was effectively
handed the answer to this exact sentence, in these exact words, **and still
answered Kim in 4/4 trials.**

That is decisive negative evidence. It rules out a definitional gap, a missing
example, and insufficient instruction specificity. More prompt text is not the
lever here.

(Those fixture-specific illustrations have since been replaced with generic
placeholders — the production prompt must not reference eval content. The rule
itself was kept: it is defensible guidance and caused **zero regressions**,
with all three blocker checks holding at 4/4.)

Notably, the *same* worked-example technique **did** durably fix the
blocker-routing problems (`escalate-twilio`, `wire-up-ui`, `full-qa-pass`
blocker — all 5/5), so the technique works in general. Owner attribution
specifically does not respond to it.

### Next lever under consideration — not implemented

A **structural schema change**: an evidence-grounded output field (e.g.
`ownerEvidence`) requiring the model to emit the exact quote that assigns the
owner, forcing the vocative binding to be explicit rather than implicit.

This is **not implemented and not scheduled**. It changes the extraction
schema, which touches the production path, so it needs to be scoped as its own
design decision — not folded into a prompt-tuning pass. Do not attempt further
instruction or few-shot fixes for this bug in the meantime.

### What is NOT the problem

- Not a fixture keyword-matching artifact (unlike the `fix-duplicate-notification-bug`
  and `prepare-patch` cases, which were genuine fixture bugs and are fixed).
  The item is `found 5/5` every run; only the `owner` field is wrong.
- Not run-to-run flakiness in the harness — it reproduces across separate API
  keys, quota windows, and days.

---

## 2. Eval quota is shared with production — MITIGATED, NOT SOLVED

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
