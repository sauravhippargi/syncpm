/**
 * Extraction evaluation harness (phases.md Phase 8) — a dev-only tool, never
 * shipped or wired into the app. Measures and catches regressions in the core
 * Gemini extraction pipeline against hand-authored ground-truth fixtures.
 *
 * Run with: `npm run eval`
 *
 * It calls the SAME extraction the app uses in production — normalizeTranscript
 * (lib/transcript.ts) then extractActionItems (lib/gemini.ts) — so it can't
 * drift out of sync with real behavior. extractActionItems is exactly what
 * lib/extraction.ts's runExtractionForTranscript() calls; we invoke it directly
 * only to skip the DB write (the eval has no transcript rows to persist to),
 * not to reimplement anything.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractActionItems } from "../lib/gemini";
import type { ExtractedActionItem } from "../lib/prompts/extraction";
import {
  normalizeTranscript,
  extensionFromFilename,
  isAllowedExtension,
} from "../lib/transcript";
import { runTrial, type Fixture, type TrialResult } from "./scoring";

const CASES_DIR = join(dirname(fileURLToPath(import.meta.url)), "cases");

// temperature=0 reduces but does not eliminate output variance (confirmed in
// this project's own testing), so every case runs multiple trials and we
// report a pass RATE, not a single pass/fail (phases.md Phase 8).
const TRIALS = Number(process.env.EVAL_TRIALS) || 3;

// 4 cases × 3 trials = 12 Gemini calls; a gap between them keeps us under the
// free-tier per-minute limit (~10-15 RPM) rather than leaning on 429 retries —
// at 2.5s a burst still tripped the limit, so pace at ~6s.
const DELAY_BETWEEN_CALLS_MS = Number(process.env.EVAL_DELAY_MS) || 6000;

// Scoring (expected/optional/forbidden tiers) lives in ./scoring.ts as pure,
// side-effect-free functions so it can be exercised deterministically without
// any Gemini calls; this file handles the I/O — loading, extraction, pacing,
// and the console report.

// ---- Transcript loading (mirrors the production ingestion path) ------------

function loadTranscript(transcriptFile: string): string {
  const raw = readFileSync(join(CASES_DIR, transcriptFile), "utf-8");
  const ext = extensionFromFilename(transcriptFile);
  // normalizeTranscript strips VTT/SRT cue numbers + timestamps for those
  // formats and trims otherwise — exactly what /api/transcripts does before
  // storing the text that extraction later runs on.
  const fileType = isAllowedExtension(ext) ? ext : undefined;
  return normalizeTranscript(raw, fileType);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// lib/gemini.ts's built-in 429 backoff (1s→2s→4s) is tuned for one user
// action; a 12-call eval burst can still exhaust the free-tier per-minute
// quota. Rather than lose a whole trial to a transient rate limit (an ERROR
// trial yields no signal), wait out a longer cooldown and retry the same
// extraction. Only rate-limit errors are retried — a real extraction/schema
// failure should surface, not be masked.
const RATE_LIMIT_COOLDOWN_MS = Number(process.env.EVAL_COOLDOWN_MS) || 35000;
const RATE_LIMIT_RETRIES = 3;

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /rate limit|429/i.test(msg);
}

async function extractWithRateLimitRetry(text: string): Promise<ExtractedActionItem[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await extractActionItems(text);
    } catch (err) {
      if (isRateLimit(err) && attempt < RATE_LIMIT_RETRIES) {
        console.log(
          `       (rate-limited — cooling down ${RATE_LIMIT_COOLDOWN_MS / 1000}s, retry ${attempt + 1}/${RATE_LIMIT_RETRIES})`
        );
        await sleep(RATE_LIMIT_COOLDOWN_MS);
        continue;
      }
      throw err;
    }
  }
}

// ---- Reporting -------------------------------------------------------------

const pct = (n: number, d: number) => (d === 0 ? "0%" : `${Math.round((n / d) * 100)}%`);

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error(
      "GEMINI_API_KEY is not set. Run via `npm run eval` (loads .env), or set it in the environment."
    );
    process.exit(1);
  }

  const fixtureFiles = readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (fixtureFiles.length === 0) {
    console.error(`No fixtures found in ${CASES_DIR}`);
    process.exit(1);
  }

  console.log("SyncPM — Extraction Eval Harness");
  console.log(`Model path: normalizeTranscript → extractActionItems (production pipeline)`);
  console.log(`${fixtureFiles.length} cases × ${TRIALS} trials each\n`);

  let suitePassedTrials = 0;
  let suiteTotalTrials = 0;

  for (const file of fixtureFiles) {
    const fixture: Fixture = JSON.parse(readFileSync(join(CASES_DIR, file), "utf-8"));
    const caseName = file.replace(/\.json$/, "");

    let transcript: string;
    try {
      transcript = loadTranscript(fixture.transcriptFile);
    } catch {
      console.log(`=== ${caseName} ===`);
      console.log(
        `  SKIPPED — transcript "${fixture.transcriptFile}" not found in evals/cases/\n`
      );
      continue;
    }

    console.log(`=== ${caseName} ===`);

    const trials: TrialResult[] = [];
    for (let t = 0; t < TRIALS; t++) {
      let items: ExtractedActionItem[];
      try {
        items = await extractWithRateLimitRetry(transcript);
      } catch (err) {
        console.log(`  Trial ${t + 1}/${TRIALS}: ERROR — ${err instanceof Error ? err.message : String(err)}`);
        suiteTotalTrials++;
        if (t < TRIALS - 1) await sleep(DELAY_BETWEEN_CALLS_MS);
        continue;
      }

      const result = runTrial(fixture, items);
      trials.push(result);
      suiteTotalTrials++;
      if (result.pass) suitePassedTrials++;

      const foundCount = result.expected.filter((e) => e.pass).length;
      console.log(
        `  Trial ${t + 1}/${TRIALS}: ${result.pass ? "PASS" : "FAIL"} — ` +
          `${foundCount}/${fixture.expectedItems.length} expected fully correct, ` +
          `${result.forbiddenLeaks.length} forbidden leak(s), ` +
          `${items.length} items extracted`
      );

      if (!result.pass) {
        for (const e of result.expected) {
          if (!e.pass) console.log(`       ✗ ${e.id}: ${e.failReasons.join("; ")}`);
        }
        for (const leak of result.forbiddenLeaks) console.log(`       ✗ FORBIDDEN leaked: ${leak}`);
        for (const v of result.optionalViolations) console.log(`       ✗ optional constraint: ${v}`);
      }

      if (t < TRIALS - 1) await sleep(DELAY_BETWEEN_CALLS_MS);
    }

    // Per-expected-item recall across trials — the "which found/missed" breakdown.
    if (trials.length > 0) {
      console.log(`  Expected-item breakdown (across ${trials.length} trial(s)):`);
      for (const exp of fixture.expectedItems) {
        const perTrial = trials.map((tr) => tr.expected.find((e) => e.id === exp.id)!);
        const foundN = perTrial.filter((e) => e.found).length;
        const passN = perTrial.filter((e) => e.pass).length;
        // Per-check pass counts, only for checks this item actually declares.
        const checkLabels = perTrial[0].checks.map((c) => c.label);
        const checkSummary = checkLabels
          .map((label) => {
            const okN = perTrial.filter((e) => e.checks.find((c) => c.label === label)?.ok).length;
            return `${label} ${okN}/${trials.length}`;
          })
          .join(", ");
        console.log(
          `     ${exp.id.padEnd(34, ".")} found ${foundN}/${trials.length}` +
            `, fully-correct ${passN}/${trials.length}` +
            (checkSummary ? `  (${checkSummary})` : "")
        );
      }

      const forbiddenTrials = trials.filter((tr) => tr.forbiddenLeaks.length > 0).length;
      console.log(
        `  Forbidden items leaked in ${forbiddenTrials}/${trials.length} trial(s)` +
          (fixture.optionalItems
            ? `; optional-constraint violations in ${trials.filter((tr) => tr.optionalViolations.length > 0).length}/${trials.length}`
            : "")
      );

      const passedTrials = trials.filter((tr) => tr.pass).length;
      console.log(`  → Pass rate: ${passedTrials}/${trials.length} (${pct(passedTrials, trials.length)})\n`);
    } else {
      console.log("");
    }
  }

  console.log("──────────────────────────────────────────");
  console.log(
    `SUITE PASS RATE: ${suitePassedTrials}/${suiteTotalTrials} trials (${pct(suitePassedTrials, suiteTotalTrials)})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
