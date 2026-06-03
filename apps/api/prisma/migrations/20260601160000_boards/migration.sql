-- Boards module. Workspace-scoped groupings for issues.

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7c3aed',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (slug unique within workspace; same slug can recur across tenants)
CREATE UNIQUE INDEX "Board_workspaceId_slug_key" ON "Board"("workspaceId", "slug");

-- CreateIndex (list-by-position queries)
CREATE INDEX "Board_workspaceId_position_idx" ON "Board"("workspaceId", "position");

-- AddForeignKey (cascade — deleting a workspace deletes its boards)
ALTER TABLE "Board" ADD CONSTRAINT "Board_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Issue gains an optional boardId.
-- SetNull on delete so deleting a board doesn't orphan its issues — they
-- just become "unassigned" and remain reachable in the unfiltered feed.
ALTER TABLE "Issue" ADD COLUMN "boardId" TEXT;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_boardId_fkey"
    FOREIGN KEY ("boardId") REFERENCES "Board"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex (board-filtered feed queries)
CREATE INDEX "Issue_boardId_idx" ON "Issue"("boardId");
