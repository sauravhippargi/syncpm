"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import JiraSyncButton, {
  type JiraConnectionSummary,
  type JiraSyncState,
} from "./JiraSyncButton";
import SlackDraftModal from "./SlackDraftModal";
import DeleteActionItemButton from "./DeleteActionItemButton";
import ActionItemFields, { type ActionItemFieldsPatch } from "./ActionItemFields";

export interface ActionItemRowData {
  id: string;
  description: string;
  owner: string | null;
  dueDate: string | null;
  status: string;
  blockerNote: string | null;
  transcriptId: string;
  transcriptTitle: string | null;
  jiraSync: JiraSyncState | null;
}

// Action Items tab only (prd.md 6.3a) — the master list of every approved
// item across all transcripts. This is the only place ticket creation
// happens now; "edit" just links back to the item's source transcript's
// Review & Edit screen, since that's the only place the description is
// editable. Owner/due date/status/blockers are edited inline via the shared
// ActionItemFields component (same one Review & Edit and Deadlines use);
// each saved field is reported up to ActionItemsList via onSaved so a status
// change can move the row between the Open/Done sections instantly, no page
// refresh.
//
// Each row is its own independent card (design.md's Component Tokens spec)
// rather than sharing one box with dividers — these cards carry more
// controls (fields plus ticket/message actions, edit/delete) than a simple
// list row, so ActionItemsList gives them a 16px gap.
export default function ActionItemRow({
  item,
  jiraConnection,
  onSaved,
  onDeleted,
}: {
  item: ActionItemRowData;
  jiraConnection: JiraConnectionSummary | null;
  onSaved: (patch: ActionItemFieldsPatch) => void;
  onDeleted: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-[10px] border border-border bg-card px-4 py-3.5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <span className="mb-1.5 text-[14.5px] font-normal text-text-primary">
            {item.description || "Untitled action item"}
          </span>
          <Link
            href={`/review/${item.transcriptId}`}
            className="text-[12.5px] text-text-secondary hover:underline"
          >
            {item.transcriptTitle || "Untitled meeting"}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/review/${item.transcriptId}?focusItem=${item.id}`}
            aria-label="Edit"
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-text-secondary transition-colors hover:bg-page"
          >
            <Pencil size={16} />
          </Link>
          <DeleteActionItemButton
            actionItemId={item.id}
            description={item.description}
            onDeleted={onDeleted}
          />
        </div>
      </div>

      <ActionItemFields
        actionItemId={item.id}
        value={{
          owner: item.owner,
          dueDate: item.dueDate,
          status: item.status,
          blockerNote: item.blockerNote,
        }}
        onSaved={onSaved}
      />

      <div className="flex flex-wrap items-center gap-2">
        <JiraSyncButton
          actionItemId={item.id}
          owner={item.owner}
          blockerNote={item.blockerNote}
          jiraConnection={jiraConnection}
          initialSync={item.jiraSync}
        />
        <SlackDraftModal actionItemId={item.id} owner={item.owner} />
      </div>
    </li>
  );
}
