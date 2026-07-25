-- CreateTable
CREATE TABLE "transcripts" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_text" TEXT NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_items" (
    "id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "owner" TEXT,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "is_blocker" BOOLEAN NOT NULL DEFAULT false,
    "blocker_note" TEXT,

    CONSTRAINT "action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_sync_log" (
    "id" TEXT NOT NULL,
    "action_item_id" TEXT NOT NULL,
    "jira_issue_key" TEXT,
    "jira_url" TEXT,
    "status" TEXT NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jira_sync_log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_sync_log" ADD CONSTRAINT "jira_sync_log_action_item_id_fkey" FOREIGN KEY ("action_item_id") REFERENCES "action_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
