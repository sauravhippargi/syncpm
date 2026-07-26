"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import JiraSyncButton, {
  type JiraConnectionSummary,
  type JiraSyncState,
} from "./JiraSyncButton";
import SlackDraftModal from "./SlackDraftModal";
import DeleteActionItemButton from "./DeleteActionItemButton";
import ActionItemStatusSelect from "./ActionItemStatusSelect";
import { isBlockerNote } from "@/lib/action-items";

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
// Review & Edit screen, since that's the only place fields are editable.
export default function ActionItemRow({
  item,
  jiraConnection,
}: {
  item: ActionItemRowData;
  jiraConnection: JiraConnectionSummary | null;
}) {
  const router = useRouter();

  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <span className="mb-1.5 text-[14.5px] font-normal text-text-primary">
            {item.description || "Untitled action item"}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-text-secondary">
            <span className="rounded-[6px] bg-accent-tint px-2 py-1 font-medium text-accent">
              {item.owner || "Unassigned"}
            </span>
            {item.dueDate && (
              <span>
                {new Date(item.dueDate).toLocaleDateString(undefined, {
                  timeZone: "UTC",
                })}
              </span>
            )}
            {isBlockerNote(item.blockerNote) && (
              <span className="rounded-[6px] bg-warning-tint px-2 py-1 font-medium text-warning-text">
                Blocker
              </span>
            )}
            <Link
              href={`/review/${item.transcriptId}`}
              className="text-text-secondary hover:underline"
            >
              {item.transcriptTitle || "Untitled meeting"}
            </Link>
          </div>
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
            onDeleted={() => router.refresh()}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ActionItemStatusSelect actionItemId={item.id} status={item.status} />
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
