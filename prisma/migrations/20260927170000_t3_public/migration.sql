-- CreateEnum
CREATE TYPE "CommunityAction" AS ENUM ('vote', 'comment');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "voting_closes" TIMESTAMPTZ(6),
ADD COLUMN     "voting_opens" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "CommunityVote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityAudit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "action" "CommunityAction" NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityVote_user_id_created_at_idx" ON "CommunityVote"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "CommunityVote_project_id_idx" ON "CommunityVote"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityVote_user_id_project_id_key" ON "CommunityVote"("user_id", "project_id");

-- CreateIndex
CREATE INDEX "CommunityComment_user_id_created_at_idx" ON "CommunityComment"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "CommunityComment_project_id_created_at_idx" ON "CommunityComment"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "CommunityAudit_project_id_created_at_idx" ON "CommunityAudit"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAudit" ADD CONSTRAINT "CommunityAudit_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityAudit" ADD CONSTRAINT "CommunityAudit_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_value_check" CHECK ("value" BETWEEN 1 AND 5);
