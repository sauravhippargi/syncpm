/**
 * Pure scoring logic for the extraction eval harness — no I/O, no Gemini
 * calls, no randomness. Kept separate from run.ts so it can be exercised
 * deterministically against synthetic extracted-item inputs (evals runs make
 * real API calls; the scoring itself must be verifiable without them).
 */
import type { ExtractedActionItem } from "../lib/prompts/extraction";

// ---- Fixture shape (evals/cases/*.json) -----------------------------------

export interface ExpectedItem {
  id: string;
  descriptionContains: string[]; // ALL must appear — this is how we identify the item (recall)
  owner?: string; // exact-match expectation
  ownerExpected?: null; // optional-item constraint: must NOT be a named owner
  dueDateExpected?: boolean; // presence/absence, not exact value
  blockerExpected?: boolean; // presence/absence of a non-empty blocker note
  blockerNoteContains?: string[]; // ANY one is enough — tolerant of paraphrasing (see hasAnyKeyword)
  note?: string;
}

export interface ForbiddenItem {
  descriptionContains: string[];
  reason: string;
}

export interface Fixture {
  transcriptFile: string;
  notes?: string;
  expectedItems: ExpectedItem[];
  optionalItems?: ExpectedItem[];
  forbiddenItems?: ForbiddenItem[];
}

// ---- Matching helpers ------------------------------------------------------

const norm = (s: string) => s.toLowerCase().trim();

// Identity/recall matching: every keyword must be present. Used to decide
// *which* extracted item corresponds to an expected item, so it stays strict —
// loosening it would risk matching the wrong item.
export function hasAllKeywords(haystack: string | null, keywords: string[]): boolean {
  if (!haystack) return false;
  const h = haystack.toLowerCase();
  return keywords.every((k) => h.includes(k.toLowerCase()));
}

// Blocker-note matching: at least one keyword is enough. The model paraphrases
// blocker reasons ("confirm ingestion pipeline config" vs. the fixture's
// literal "access"), and penalizing a semantically-correct note for not
// containing every exact word measured wording, not correctness. The listed
// keywords are treated as acceptable alternative phrasings.
export function hasAnyKeyword(haystack: string | null, keywords: string[]): boolean {
  if (!haystack) return false;
  const h = haystack.toLowerCase();
  return keywords.some((k) => h.includes(k.toLowerCase()));
}

export function hasDueDate(item: ExtractedActionItem): boolean {
  return item.dueDate != null && item.dueDate.trim() !== "";
}

export function hasBlocker(item: ExtractedActionItem): boolean {
  return item.blockerNote != null && item.blockerNote.trim() !== "";
}

export function findMatch(
  items: ExtractedActionItem[],
  keywords: string[]
): ExtractedActionItem | undefined {
  return items.find((it) => hasAllKeywords(it.description, keywords));
}

// ---- Per-trial scoring -----------------------------------------------------

export interface CheckResult {
  label: string;
  ok: boolean;
}

export interface ExpectedResult {
  id: string;
  found: boolean;
  checks: CheckResult[];
  pass: boolean;
  failReasons: string[];
}

export interface TrialResult {
  expected: ExpectedResult[];
  forbiddenLeaks: string[];
  optionalViolations: string[];
  pass: boolean;
}

export function scoreExpected(
  item: ExpectedItem,
  extracted: ExtractedActionItem[]
): ExpectedResult {
  const match = findMatch(extracted, item.descriptionContains);
  const found = match !== undefined;
  const checks: CheckResult[] = [];
  const failReasons: string[] = [];

  if (!found) {
    failReasons.push(`not found (needed all of: ${item.descriptionContains.join(", ")})`);
  }

  if (item.owner !== undefined) {
    const ok = found && norm(match!.owner ?? "") === norm(item.owner);
    checks.push({ label: "owner", ok });
    if (found && !ok) {
      failReasons.push(`owner: expected "${item.owner}", got "${match!.owner ?? "(none)"}"`);
    }
  }

  if (item.dueDateExpected !== undefined) {
    const ok = found && hasDueDate(match!) === item.dueDateExpected;
    checks.push({ label: "dueDate", ok });
    if (found && !ok) {
      failReasons.push(
        item.dueDateExpected
          ? "dueDate: expected a date, got none"
          : `dueDate: expected none, got "${match!.dueDate}" (hallucinated)`
      );
    }
  }

  if (item.blockerExpected !== undefined) {
    const ok = found && hasBlocker(match!) === item.blockerExpected;
    checks.push({ label: "blocker", ok });
    if (found && !ok) {
      failReasons.push(
        item.blockerExpected
          ? "blocker: expected a blocker note, got none"
          : "blocker: expected none, got a blocker note"
      );
    }
  }

  if (item.blockerNoteContains !== undefined) {
    const ok = found && hasAnyKeyword(match!.blockerNote, item.blockerNoteContains);
    checks.push({ label: "blockerNote", ok });
    if (found && !ok) {
      failReasons.push(
        `blockerNote: expected any of [${item.blockerNoteContains.join(", ")}], got "${match!.blockerNote ?? "(none)"}"`
      );
    }
  }

  const pass = found && checks.every((c) => c.ok);
  return { id: item.id, found, checks, pass, failReasons };
}

// Optional items are never penalized for presence OR absence — but IF extracted,
// any stated constraint must hold (e.g. the Meridian item must not be
// confidently assigned to a named person; a "no rush" item must not get a
// hallucinated hard date). A broken constraint is a real precision failure.
export function scoreOptional(
  item: ExpectedItem,
  extracted: ExtractedActionItem[]
): string | null {
  const match = findMatch(extracted, item.descriptionContains);
  if (!match) return null;

  if (item.ownerExpected === null && norm(match.owner ?? "") !== "") {
    return `${item.id}: extracted with a named owner "${match.owner}" but no one volunteered (should be unassigned or skipped)`;
  }
  if (item.dueDateExpected === false && hasDueDate(match)) {
    return `${item.id}: extracted with a hallucinated date "${match.dueDate}" despite no real deadline`;
  }
  return null;
}

export function runTrial(fixture: Fixture, extracted: ExtractedActionItem[]): TrialResult {
  const expected = fixture.expectedItems.map((e) => scoreExpected(e, extracted));

  const forbiddenLeaks: string[] = [];
  for (const f of fixture.forbiddenItems ?? []) {
    if (findMatch(extracted, f.descriptionContains)) {
      forbiddenLeaks.push(`[${f.descriptionContains.join(", ")}] — ${f.reason}`);
    }
  }

  const optionalViolations: string[] = [];
  for (const o of fixture.optionalItems ?? []) {
    const violation = scoreOptional(o, extracted);
    if (violation) optionalViolations.push(violation);
  }

  const pass =
    expected.every((e) => e.pass) &&
    forbiddenLeaks.length === 0 &&
    optionalViolations.length === 0;

  return { expected, forbiddenLeaks, optionalViolations, pass };
}
