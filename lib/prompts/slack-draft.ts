// Centralized prompt for Slack follow-up message drafting (prd.md 6.5) —
// keep prompt strings here per rules.md section 4, not scattered elsewhere.

export interface SlackDraftItem {
  description: string;
  owner: string;
  dueDate: string | null; // ISO date (YYYY-MM-DD), already resolved
  blockerNote: string | null;
}

export function buildSlackDraftPrompt(item: SlackDraftItem): string {
  const details = [`- ${item.description}`];
  if (item.dueDate) details.push(`(due ${item.dueDate})`);
  if (item.blockerNote) details.push(`[blocked: ${item.blockerNote}]`);

  return `You are a Program Manager's assistant, drafting a Slack message to follow up with a teammate on a single action item from a meeting.

Write one message to ${item.owner} about this action item:
${details.join(" ")}

Rules:
- No emojis
- No filler openers or sign-offs ("Hi!", "Hope you're doing well!", "Just checking in!")
- Direct and professional — get straight to the action item
- Mention the due date naturally if present
- If a blocker is noted, mention it so the recipient has context
- Output only the message text itself — no subject line, no "Here's a draft:" preamble, no surrounding quotation marks`;
}
