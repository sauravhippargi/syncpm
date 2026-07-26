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

Write one message to ${item.owner} (first name: ${firstName}) about this action item:
${details.join(" ")}

Rules:
- Always open with a personal greeting using the first name, e.g. "Hi ${firstName}," — never a generic or unaddressed opener
- No emojis
- No filler beyond that greeting ("Hope you're doing well!", "Just checking in!")
- Direct and professional — get straight to the action item right after the greeting
- Mention the due date naturally if present
- If a blocker is noted, mention it so the recipient has context
- Do not name or reference any specific chat tool or platform (e.g. Slack, Teams, email) — this message could be sent through any of them
- Output only the message text itself — no subject line, no "Here's a draft:" preamble, no surrounding quotation marks`;
}
