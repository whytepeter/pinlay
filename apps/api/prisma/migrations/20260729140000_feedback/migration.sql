-- In-app product feedback about pinlay itself (distinct from Pins, which are
-- feedback about a customer's own site). Not workspace-scoped: these are
-- messages to the pinlay team, so no workspace read path should reach them.

-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('bug', 'idea', 'question', 'other');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "kind" "FeedbackKind" NOT NULL DEFAULT 'other',
    "message" TEXT NOT NULL,
    -- Author fields are denormalised so a report stays readable after the
    -- user is deleted; userId goes NULL rather than cascading the row away.
    "userId" TEXT,
    "email" TEXT,
    "name" TEXT,
    "workspaceId" TEXT,
    -- Client-captured context: the route they were on and their browser.
    "path" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (newest-first triage listing)
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex (all reports from one user)
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- AddForeignKey (SetNull — deleting an account must not destroy the report)
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
