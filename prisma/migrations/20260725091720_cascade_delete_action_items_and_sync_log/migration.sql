-- DropForeignKey
ALTER TABLE "action_items" DROP CONSTRAINT "action_items_transcript_id_fkey";

-- DropForeignKey
ALTER TABLE "jira_sync_log" DROP CONSTRAINT "jira_sync_log_action_item_id_fkey";

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_sync_log" ADD CONSTRAINT "jira_sync_log_action_item_id_fkey" FOREIGN KEY ("action_item_id") REFERENCES "action_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
