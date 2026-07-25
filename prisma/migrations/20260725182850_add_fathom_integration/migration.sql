-- CreateTable
CREATE TABLE "fathom_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "webhook_secret" TEXT NOT NULL,
    "fathom_webhook_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fathom_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fathom_connections_user_id_key" ON "fathom_connections"("user_id");

-- AddForeignKey
ALTER TABLE "fathom_connections" ADD CONSTRAINT "fathom_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "transcripts" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "fathom_meeting_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_fathom_meeting_id_key" ON "transcripts"("fathom_meeting_id");
