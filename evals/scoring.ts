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
  // Whether a non-empty ownerEvidence quote must accompany that owner (prd.md
  // 6.2a). Only consulted when `owner` is set, and defaults to true there —
  // an owner is never supposed to survive extraction without one, so fixtures
  // opt in by simply naming an owner. Set false only to deliberately exempt a
  // case; it is never a reason to loosen the `owner` expectation itself.
  ownerEvidenceExpected?: boolean;
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

// Presence-only, like hasDueDate/hasBlocker — the quote's *wording* isn't
// scored, since any verbatim phrase that names the person is a valid
// citation and pinning exact text would measure phrasing, not correctness.
export function hasOwnerEvidence(item: ExtractedActionItem): boolean {
  return item.ownerEvidence != null && item.ownerEvidence.trim() !== "";
}

export function findMatches(
  items: ExtractedActionItem[],
  keywords: string[]
): ExtractedActionItem[] {
  return items.filter((it) => hasAllKeywords(it.description, keywords));
}

export interface MatchOutcome {
  match?: ExtractedActionItem; // set only when exactly one item matched
  matches: ExtractedActionItem[];
  ambiguous: boolean;
}

// Identity matching must resolve to exactly ONE item — being merely present is
// not enough. This used to be `items.find(...)`, i.e. first-match-wins, which
// fails silently and in both directions as descriptions drift: an expectation
// whose keywords also hit an earlier, unrelated item scores THAT item instead,
// producing a false failure (the real item was extracted correctly) or a false
// pass (the wrong item happens to satisfy the checks). Both were observed on
// engineering-sprint-sync. A keyword set that no longer pins down one item is
// a defect in the fixture, so it is now reported rather than resolved by
// array order.
export function findMatch(
  items: ExtractedActionItem[],
  keywords: string[]
): MatchOutcome {
  const matches = findMatches(items, keywords);
  return {
    match: matches.length === 1 ? matches[0] : undefined,
    matches,
    ambiguous: matches.length > 1,
  };
}

function ambiguityReason(keywords: string[], matches: ExtractedActionItem[]): string {
  return (
    `AMBIGUOUS_MATCH: [${keywords.join(", ")}] matched ${matches.length} extracted items — ` +
    matches.map((m) => `"${m.description}"`).join(" | ") +
    " — fixture keywords must identify exactly one item; tighten them (identity matching only, never the expected values)"
  );
}

// ---- Per-trial scoring -----------------------------------------------------

export interface CheckResult {
  label: string;
  ok: boolean;
}

export interface ExpectedResult {
  id: string;
  found: boolean; // true only on a UNIQUE match — an ambiguous one isn't identified
  ambiguous: boolean;
  checks: CheckResult[];
  pass: boolean;
  failReasons: string[];
}

export interface TrialResult {
  expected: ExpectedResult[];
  forbiddenLeaks: string[];
  optionalViolations: string[];
  // Two expectations resolving to the same extracted item — the other half of
  // the substring-collision problem, invisible to the per-expectation check.
  matchCollisions: string[];
  pass: boolean;
}

export function scoreExpected(
  item: ExpectedItem,
  extracted: ExtractedActionItem[]
): ExpectedResult {
  const { match, matches, ambiguous } = findMatch(extracted, item.descriptionContains);
  const found = match !== undefined;
  const checks: CheckResult[] = [];
  const failReasons: string[] = [];

  // Ambiguity and absence are different defects and must not read the same in
  // the report: "not found" points at the model, AMBIGUOUS_MATCH points at the
  // fixture. Every field check below is guarded on `found`, so an ambiguous
  // expectation records its checks as failed without inventing field-level
  // reasons about an item we can't confidently say we're looking at.
  if (ambiguous) {
    failReasons.push(ambiguityReason(item.descriptionContains, matches));
  } else if (!found) {
    failReasons.push(`not found (needed all of: ${item.descriptionContains.join(", ")})`);
  }

  if (item.owner !== undefined) {
    const ok = found && norm(match!.owner ?? "") === norm(item.owner);
    checks.push({ label: "owner", ok });
    if (found && !ok) {
      failReasons.push(`owner: expected "${item.owner}", got "${match!.owner ?? "(none)"}"`);
    }
  }

  // Additive check (prd.md 6.2a) — it never changes what owner value is
  // expected, only that whatever owner IS extracted came with a citation.
  // validateExtractionResult already drops an uncited owner to null, so in
  // practice this fails alongside the owner check rather than alone; scoring
  // it separately is what makes the *reason* visible in the report ("the
  // model had no quote") instead of just "owner: got (none)".
  if (item.owner !== undefined && (item.ownerEvidenceExpected ?? true)) {
    const ok = found && hasOwnerEvidence(match!);
    checks.push({ label: "ownerEvidence", ok });
    if (found && !ok) {
      failReasons.push(
        `ownerEvidence: expected a supporting transcript quote for owner "${item.owner}", got none`
      );
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
  return { id: item.id, found, ambiguous, checks, pass, failReasons };
}

// Optional items are never penalized for presence OR absence — but IF extracted,
// any stated constraint must hold (e.g. the Meridian item must not be
// confidently assigned to a named person; a "no rush" item must not get a
// hallucinated hard date). A broken constraint is a real precision failure.
export function scoreOptional(
  item: ExpectedItem,
  extracted: ExtractedActionItem[]
): string | null {
  const { match, matches, ambiguous } = findMatch(extracted, item.descriptionContains);
  // Absence is fine for an optional item; not knowing WHICH item it is isn't.
  // Silently skipping here would mean a real constraint violation could hide
  // behind a keyword set that got sloppier over time.
  if (ambiguous) return `${item.id}: ${ambiguityReason(item.descriptionContains, matches)}`;
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

  // Forbidden items are the one place multiplicity isn't ambiguity — two
  // matches is two leaks, not an unidentifiable item — so presence is still
  // the whole question here.
  const forbiddenLeaks: string[] = [];
  for (const f of fixture.forbiddenItems ?? []) {
    if (findMatches(extracted, f.descriptionContains).length > 0) {
      forbiddenLeaks.push(`[${f.descriptionContains.join(", ")}] — ${f.reason}`);
    }
  }

  const optionalViolations: string[] = [];
  for (const o of fixture.optionalItems ?? []) {
    const violation = scoreOptional(o, extracted);
    if (violation) optionalViolations.push(violation);
  }

  // The mirror image of AMBIGUOUS_MATCH: each expectation resolves uniquely,
  // but two of them land on the SAME extracted item. Both then score that one
  // item, so one of them is measuring something it was never written for — and
  // it can pass while doing so, which is how a false pass survives review. Only
  // unique matches are compared; an ambiguous expectation already reported.
  const matchCollisions: string[] = [];
  const byDescription = new Map<string, string[]>();
  for (const [i, result] of expected.entries()) {
    const match = findMatch(extracted, fixture.expectedItems[i].descriptionContains).match;
    if (!match) continue;
    const ids = byDescription.get(match.description) ?? [];
    ids.push(result.id);
    byDescription.set(match.description, ids);
  }
  for (const [description, ids] of byDescription) {
    if (ids.length > 1) {
      matchCollisions.push(
        `${ids.join(" + ")} both resolved to the same extracted item "${description}" — ` +
          "at most one of them can be measuring the right thing"
      );
    }
  }

  const pass =
    expected.every((e) => e.pass) &&
    matchCollisions.length === 0 &&
    forbiddenLeaks.length === 0 &&
    optionalViolations.length === 0;

  return { expected, forbiddenLeaks, optionalViolations, matchCollisions, pass };
}
