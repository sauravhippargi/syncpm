# Gemini Free-Tier Quota Notes

Concrete numbers from a real working session (eval harness build + extraction
tuning), written down so the "why does this app use two Gemini models"
rationale doesn't have to be re-derived from memory each time quota blocks work.

/ Not consumed by the app at runtime — this is dev/eval activity. The deployed
app makes ~1 extraction call per uploaded/imported transcript. /

## Per-call cost by activity

Every extraction is **one `generateContent` request**. Costs below are
successful (HTTP 200) calls; rate-limited retries add rejected attempts on top.

| Activity | Successful calls |
|---|---|
| One extraction (1 transcript) | 1 |
| Isolated single fixture, default (`EVAL_CASE=… `, 3 trials) | 3 |
| Isolated single fixture at `EVAL_TRIALS=5` | 5 |
| **Full eval suite** (4 fixtures × 3 trials) | **12** |
| Extraction-consistency investigation (temp 0 vs default study) | ~12 |

Per-call token size (never the binding limit): fixed prompt scaffolding ≈492
tokens + transcript 488–789 tokens ≈ **~1,000–1,300 input tokens**, output
~200–400 tokens. Free-tier TPM (~250K/min) is nowhere near binding — the
limits that bite are **request-count** limits (RPM/RPD).

## What today's session actually consumed

Session Gemini activity spanned **two daily-quota windows** (a reset happened
partway through). Successful calls:

**Window 1 (eval build + tuning):**
- Extraction-consistency investigation: **12**
- Eval Run A (full suite, 2.5s spacing): **11** successful, 1 errored
- Eval Run B (full suite, 6s spacing): **11** successful, 1 errored
- Eval Run C (full suite, killed mid-run): **2** successful, 2 errored
- → **~36 successful**, then every request started returning 429 (a follow-up
  single-call probe also 429'd — hard wall reached)

**Window 2 (post-reset re-verification):**
- Eval Run D (full suite, post-prompt-fix): **8** successful, 4 errored
- Eval Run E (isolated engineering ×5): **0** successful, 5 errored
- → **~8 successful**, then the wall again

**Session total: ~44 successful calls**, plus **100+ rejected (429) attempts**
from retry storms (see below).

## The binding limit is per-minute (RPM), not really per-day volume

Documented free-tier limits for `gemini-2.5-flash` are roughly **10 RPM /
250 RPD / 250K TPM** — but *verify at ai.google.dev/gemini-api/docs/rate-limits,
these change often*, and the observed behavior did **not** cleanly match a
250/day cap:

- Window 1 hit a hard sustained 429 wall after only **~36** successful calls —
  well under 250 RPD. That points to the **10-requests-per-minute** ceiling as
  the real blocker: a 12-call suite fires faster than 10/min the moment retries
  stack up, so trials error even at 6s spacing.
- But Run E (isolated, 5 trials, 6s spacing + 35s cooldowns, nothing else
  running) still failed **all 5** across several minutes — a pure per-minute
  limit should have cleared in that time. So by then it was likely genuine
  **daily** exhaustion too.
- Honest conclusion: the logs can't cleanly separate RPM vs RPD, but the free
  tier's effective ceiling for this kind of bursty multi-call work is **low and
  opaque** — a single day of one consistency study + a few eval runs exhausts
  it. Exact daily cap unverified; check the live usage dashboard
  (ai.dev/rate-limit) next time rather than trusting a remembered number.

### Retry storms amplify the burn (harness lesson)
Each errored trial can fire ~16 rejected HTTP attempts: `lib/gemini.ts`'s
built-in 429 backoff (up to 4 attempts) nested inside the eval's own
rate-limit cooldown wrapper (up to ~4 cycles). Rejected requests still count
against the per-minute bucket, so aggressive retrying is self-perpetuating —
it empties RPM faster and causes *more* 429s. A gentler, slower cadence would
complete more trials than aggressive retries do.

## Why the app carries two Gemini models

This is the concrete evidence for that design choice. **RPD quota is tracked
per-model** (separate buckets per model id). The app's primary extraction model
is `gemini-2.5-flash`; `gemini-flash-lite` exists as a **fallback that draws on
a separate daily bucket**. When `gemini-2.5-flash`'s daily allowance is spent
(exactly the wall this session kept hitting), switching to flash-lite buys a
fresh same-day allowance without waiting ~24h for a reset. See the model-choice
history in `lib/gemini.ts`.

Takeaway for the roadmap discussion: on the free tier, extraction is
**request-rate-limited, not token-limited**, and the per-minute ceiling makes
batchy workloads (evals, backfills, re-runs) the first thing to break. A paid
tier (higher RPM/RPD) — not a bigger context or cheaper tokens — is what this
app would actually need to run its own eval suite reliably or scale ingestion.
