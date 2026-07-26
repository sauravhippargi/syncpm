// Centralized prompt for Slack follow-up message drafting (prd.md 6.5) —
// keep prompt strings here per rules.md section 4, not scattered elsewhere.

export interface SlackDraftItem {
  description: string;
  dueDate: string | null; // ISO date (YYYY-MM-DD), already resolved
  blockerNote: string | null;
}

export function buildSlackDraftPrompt(
  ownerName: string,
  meetingTitle: string,
  items: SlackDraftItem[]
): string {
  const itemLines = items
    .map((item) => {
      const parts = [`- ${item.description}`];
      if (item.dueDate) parts.push(`(due ${item.dueDate})`);
      if (item.blockerNote) parts.push(`[blocked: ${item.blockerNote}]`);
      return parts.join(" ");
    })
    .join("\n");

  return `You are a Program Manager's assistant, drafting a Slack message to follow up with a teammate on their action items from a meeting.

Write one message to ${ownerName}, summarizing their action item(s) below from the meeting "${meetingTitle}".

Rules:
- No emojis
- No filler openers or sign-offs ("Hi!", "Hope you're doing well!", "Just checking in!")
- Direct and professional — get straight to the action items
- Mention due dates naturally if present
- If an item notes a blocker, mention it so the recipient has context
- Output only the message text itself — no subject line, no "Here's a draft:" preamble, no surrounding quotation marks

${ownerName}'s action items from this meeting:
${itemLines}`;
}
