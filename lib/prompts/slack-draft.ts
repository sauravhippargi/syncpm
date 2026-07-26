// Centralized prompt for Slack follow-up message drafting (prd.md 6.5) —
// keep prompt strings here per rules.md section 4, not scattered elsewhere.

export interface SlackDraftItem {
  description: string;
  owner: string;
  dueDate: string | null; // ISO date (YYYY-MM-DD), already resolved
  blockerNote: string | null;
}

export function buildSlackDraftPrompt(item: SlackDraftItem): string {
  // An owner is guaranteed non-empty here — the "Draft message" button is
  // disabled otherwise (prd.md 6.5) — so the greeting always has a real
  // first name to use, never a generic fallback.
  const firstName = item.owner.trim().split(/\s+/)[0];

  const details = [`- ${item.description}`];
  if (item.dueDate) details.push(`(due ${item.dueDate})`);
  if (item.blockerNote) details.push(`[blocked: ${item.blockerNote}]`);

  return `You are a Program Manager's assistant, drafting a short message to follow up with a teammate on a single action item from a meeting.

This action item already came out of a meeting the recipient was part of — so it is a follow-up on something already known and previously discussed, NOT a brand-new request being made for the first time.

Write one message to ${item.owner} (first name: ${firstName}) about this action item:
${details.join(" ")}

Rules:
- Always open with a personal greeting using the first name, e.g. "Hi ${firstName}," — never a generic or unaddressed opener
- Frame it as a check-in on existing, already-agreed work — use language like "Following up on...", "Wanted to check in on...", or "Any update on...". Do NOT phrase it as a fresh request ("Could you do X?") as if the task were new.
- Do NOT quote or closely mirror the action item's description back as a direct question. Rephrase it into natural follow-up language. For example, if the description is "Circle back to the pricing review," do not write "Could you circle back to the pricing review?" — that just hands the extracted phrasing straight back. Instead write something like "Following up on the pricing review — have you had a chance to look at it yet?"
- This matters most when the description carries the owner's own vague or hedged wording (e.g. "circle back to," "get to at some point," "take a look when you can"): reframe it into a natural nudge rather than repeating their own loose words back at them.
- Don't overcorrect: if the description is already a clear, specific task (e.g. "Fix the bug in the billing webhook handler"), keep that specificity — just present it as a follow-up ("Following up on the billing webhook bug fix — any update?"), not an invented, awkwardly euphemized version.
- No emojis
- No content-free pleasantry openers ("Hope you're doing well!", a standalone "Just checking in!"). The follow-up framing above refers to the actual task, which is exactly what's wanted — it is not filler.
- Direct and professional
- Mention the due date naturally if present
- If a blocker is noted, mention it so the recipient has context
- Do not name or reference any specific chat tool or platform (e.g. Slack, Teams, email) — this message could be sent through any of them
- Do not include any links or URLs, or mention a ticket link at all — if this item has a real synced ticket, the application appends that line separately using the actual URL, never one you generate
- Output only the message text itself — no subject line, no "Here's a draft:" preamble, no surrounding quotation marks`;
}
