-- Invites: pending workspace memberships.

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'member',
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- Unique token for accept-by-link (future email flow); also enforces no
-- collisions across the table.
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- Lookup indexes for the typical access paths
CREATE INDEX "Invite_workspaceId_email_idx" ON "Invite"("workspaceId", "email");
CREATE INDEX "Invite_workspaceId_status_idx" ON "Invite"("workspaceId", "status");

-- AddForeignKey (cascade — deleting a workspace clears its invites)
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (no cascade — inviter deletion is rare and we want to
-- preserve audit history; switch to SetNull + nullable column if that needs
-- to change later)
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
